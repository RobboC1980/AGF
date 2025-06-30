"""
Backup and Disaster Recovery Manager
Provides automated backups, encryption, versioning, and recovery procedures
"""

import os
import json
import gzip
import tarfile
import shutil
import hashlib
import boto3
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
import structlog
from pathlib import Path

logger = structlog.get_logger(__name__)

class BackupType(Enum):
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"

class BackupStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFIED = "verified"

@dataclass
class BackupJob:
    id: str
    backup_type: BackupType
    status: BackupStatus
    started_at: datetime
    completed_at: Optional[datetime]
    file_path: str
    file_size: int
    checksum: str
    encryption_key_id: str
    retention_days: int
    metadata: Dict[str, Any]

class BackupManager:
    """Comprehensive backup and disaster recovery manager"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.backup_root = Path(config.get("backup_root", "/var/backups/agileforge"))
        self.s3_bucket = config.get("s3_bucket")
        self.encryption_key = config.get("encryption_key")
        self.retention_policy = config.get("retention_policy", {
            "daily": 7,    # Keep daily backups for 7 days
            "weekly": 4,   # Keep weekly backups for 4 weeks
            "monthly": 12  # Keep monthly backups for 12 months
        })
        
        # Create backup directory
        self.backup_root.mkdir(parents=True, exist_ok=True)
        
        # Initialize S3 client if configured
        self.s3_client = None
        if self.s3_bucket:
            self.s3_client = boto3.client('s3')
    
    async def create_database_backup(self, backup_type: BackupType = BackupType.FULL) -> BackupJob:
        """Create database backup"""
        backup_id = self._generate_backup_id()
        timestamp = datetime.utcnow()
        
        logger.info("Starting database backup", backup_id=backup_id, backup_type=backup_type.value)
        
        try:
            # Create backup job
            backup_job = BackupJob(
                id=backup_id,
                backup_type=backup_type,
                status=BackupStatus.IN_PROGRESS,
                started_at=timestamp,
                completed_at=None,
                file_path="",
                file_size=0,
                checksum="",
                encryption_key_id=self.encryption_key or "",
                retention_days=self._get_retention_days(backup_type),
                metadata={}
            )
            
            # Perform backup
            if backup_type == BackupType.FULL:
                backup_file = await self._create_full_database_backup(backup_id)
            elif backup_type == BackupType.INCREMENTAL:
                backup_file = await self._create_incremental_backup(backup_id)
            else:
                backup_file = await self._create_differential_backup(backup_id)
            
            # Update backup job
            backup_job.file_path = str(backup_file)
            backup_job.file_size = backup_file.stat().st_size
            backup_job.checksum = self._calculate_checksum(backup_file)
            backup_job.completed_at = datetime.utcnow()
            backup_job.status = BackupStatus.COMPLETED
            
            # Encrypt backup if configured
            if self.encryption_key:
                encrypted_file = await self._encrypt_backup(backup_file)
                backup_job.file_path = str(encrypted_file)
                backup_job.file_size = encrypted_file.stat().st_size
                backup_job.checksum = self._calculate_checksum(encrypted_file)
            
            # Upload to S3 if configured
            if self.s3_client:
                await self._upload_to_s3(Path(backup_job.file_path), backup_job)
            
            # Verify backup
            if await self._verify_backup(backup_job):
                backup_job.status = BackupStatus.VERIFIED
            
            # Save backup metadata
            await self._save_backup_metadata(backup_job)
            
            logger.info("Database backup completed", 
                       backup_id=backup_id, 
                       file_size=backup_job.file_size,
                       duration=(backup_job.completed_at - backup_job.started_at).total_seconds())
            
            return backup_job
            
        except Exception as e:
            logger.error("Database backup failed", backup_id=backup_id, error=str(e))
            backup_job.status = BackupStatus.FAILED
            backup_job.completed_at = datetime.utcnow()
            await self._save_backup_metadata(backup_job)
            raise
    
    async def _create_full_database_backup(self, backup_id: str) -> Path:
        """Create full database backup using Supabase CLI or pg_dump"""
        backup_file = self.backup_root / f"database_full_{backup_id}.sql.gz"
        
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
        if not database_url:
            raise ValueError("Database URL not configured")
        
        # Use pg_dump to create backup
        import subprocess
        
        dump_command = [
            "pg_dump",
            database_url,
            "--verbose",
            "--clean",
            "--if-exists",
            "--create"
        ]
        
        # Create compressed backup
        with gzip.open(backup_file, 'wt') as f:
            process = subprocess.Popen(dump_command, stdout=subprocess.PIPE, text=True)
            for line in process.stdout:
                f.write(line)
            
            if process.wait() != 0:
                raise RuntimeError("pg_dump failed")
        
        return backup_file
    
    async def _create_incremental_backup(self, backup_id: str) -> Path:
        """Create incremental backup (changes since last backup)"""
        # This is a simplified implementation
        # In production, you'd use WAL shipping or similar
        
        backup_file = self.backup_root / f"database_incremental_{backup_id}.sql.gz"
        
        # Get last backup time
        last_backup_time = await self._get_last_backup_time()
        
        # Query for changes since last backup
        # This would be more sophisticated in practice
        query = f"""
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        """
        
        # Create a minimal backup for demonstration
        with gzip.open(backup_file, 'wt') as f:
            f.write(f"-- Incremental backup from {last_backup_time}\n")
            f.write(query)
        
        return backup_file
    
    async def _create_differential_backup(self, backup_id: str) -> Path:
        """Create differential backup (changes since last full backup)"""
        backup_file = self.backup_root / f"database_differential_{backup_id}.sql.gz"
        
        # Similar to incremental but based on last full backup
        last_full_backup_time = await self._get_last_full_backup_time()
        
        with gzip.open(backup_file, 'wt') as f:
            f.write(f"-- Differential backup from {last_full_backup_time}\n")
        
        return backup_file
    
    async def _encrypt_backup(self, backup_file: Path) -> Path:
        """Encrypt backup file"""
        encrypted_file = backup_file.with_suffix(backup_file.suffix + '.enc')
        
        # Simple encryption using Fernet (in production, use more robust encryption)
        from cryptography.fernet import Fernet
        
        key = self.encryption_key.encode() if isinstance(self.encryption_key, str) else self.encryption_key
        fernet = Fernet(key)
        
        with open(backup_file, 'rb') as f_in:
            with open(encrypted_file, 'wb') as f_out:
                data = f_in.read()
                encrypted_data = fernet.encrypt(data)
                f_out.write(encrypted_data)
        
        # Remove unencrypted file
        backup_file.unlink()
        
        return encrypted_file
    
    async def _upload_to_s3(self, backup_file: Path, backup_job: BackupJob):
        """Upload backup to S3"""
        if not self.s3_client:
            return
        
        s3_key = f"backups/{backup_job.backup_type.value}/{backup_file.name}"
        
        try:
            self.s3_client.upload_file(
                str(backup_file),
                self.s3_bucket,
                s3_key,
                ExtraArgs={
                    'Metadata': {
                        'backup-id': backup_job.id,
                        'backup-type': backup_job.backup_type.value,
                        'checksum': backup_job.checksum
                    }
                }
            )
            
            backup_job.metadata['s3_key'] = s3_key
            logger.info("Backup uploaded to S3", backup_id=backup_job.id, s3_key=s3_key)
            
        except Exception as e:
            logger.error("Failed to upload backup to S3", backup_id=backup_job.id, error=str(e))
            raise
    
    async def _verify_backup(self, backup_job: BackupJob) -> bool:
        """Verify backup integrity"""
        try:
            backup_file = Path(backup_job.file_path)
            
            # Verify file exists and is not empty
            if not backup_file.exists() or backup_file.stat().st_size == 0:
                return False
            
            # Verify checksum
            calculated_checksum = self._calculate_checksum(backup_file)
            if calculated_checksum != backup_job.checksum:
                logger.error("Backup checksum mismatch", 
                           backup_id=backup_job.id,
                           expected=backup_job.checksum,
                           calculated=calculated_checksum)
                return False
            
            # Test that backup can be read
            if backup_file.suffix == '.gz':
                with gzip.open(backup_file, 'rt') as f:
                    f.read(1024)  # Read first 1KB to verify it's readable
            
            return True
            
        except Exception as e:
            logger.error("Backup verification failed", backup_id=backup_job.id, error=str(e))
            return False
    
    async def restore_from_backup(self, backup_id: str, target_db: str = None) -> bool:
        """Restore database from backup"""
        logger.info("Starting database restore", backup_id=backup_id)
        
        try:
            # Load backup metadata
            backup_job = await self._load_backup_metadata(backup_id)
            if not backup_job:
                raise ValueError(f"Backup {backup_id} not found")
            
            # Download from S3 if necessary
            backup_file = Path(backup_job.file_path)
            if not backup_file.exists() and self.s3_client:
                backup_file = await self._download_from_s3(backup_job)
            
            # Decrypt if necessary
            if backup_file.suffix == '.enc':
                backup_file = await self._decrypt_backup(backup_file)
            
            # Verify backup before restore
            if not await self._verify_backup(backup_job):
                raise RuntimeError("Backup verification failed")
            
            # Perform restore
            database_url = target_db or os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("Target database URL not specified")
            
            # Use psql to restore
            import subprocess
            
            restore_command = [
                "psql",
                database_url,
                "-f", "-"
            ]
            
            # Restore from compressed backup
            with gzip.open(backup_file, 'rt') as f:
                process = subprocess.Popen(restore_command, stdin=subprocess.PIPE, text=True)
                for line in f:
                    process.stdin.write(line)
                process.stdin.close()
                
                if process.wait() != 0:
                    raise RuntimeError("Database restore failed")
            
            logger.info("Database restore completed", backup_id=backup_id)
            return True
            
        except Exception as e:
            logger.error("Database restore failed", backup_id=backup_id, error=str(e))
            raise
    
    async def cleanup_old_backups(self):
        """Clean up old backups based on retention policy"""
        logger.info("Starting backup cleanup")
        
        # Load all backup metadata
        backups = await self._list_all_backups()
        
        now = datetime.utcnow()
        deleted_count = 0
        
        for backup in backups:
            retention_days = backup.retention_days
            if (now - backup.started_at).days > retention_days:
                try:
                    await self._delete_backup(backup)
                    deleted_count += 1
                except Exception as e:
                    logger.error("Failed to delete backup", backup_id=backup.id, error=str(e))
        
        logger.info("Backup cleanup completed", deleted_count=deleted_count)
    
    async def get_backup_status(self) -> Dict[str, Any]:
        """Get backup system status"""
        backups = await self._list_all_backups()
        
        recent_backups = [
            b for b in backups 
            if (datetime.utcnow() - b.started_at).days <= 7
        ]
        
        successful_backups = [b for b in recent_backups if b.status == BackupStatus.VERIFIED]
        failed_backups = [b for b in recent_backups if b.status == BackupStatus.FAILED]
        
        total_size = sum(b.file_size for b in backups)
        
        return {
            "total_backups": len(backups),
            "recent_backups": len(recent_backups),
            "successful_recent": len(successful_backups),
            "failed_recent": len(failed_backups),
            "total_size_bytes": total_size,
            "total_size_gb": round(total_size / (1024**3), 2),
            "last_backup": max(backups, key=lambda x: x.started_at).started_at.isoformat() if backups else None,
            "backup_health": "healthy" if not failed_backups else "degraded"
        }
    
    def _generate_backup_id(self) -> str:
        """Generate unique backup ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        random_suffix = hashlib.md5(os.urandom(16)).hexdigest()[:8]
        return f"{timestamp}_{random_suffix}"
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate MD5 checksum of file"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def _get_retention_days(self, backup_type: BackupType) -> int:
        """Get retention days based on backup type"""
        if backup_type == BackupType.FULL:
            return 30  # Keep full backups for 30 days
        elif backup_type == BackupType.INCREMENTAL:
            return 7   # Keep incremental backups for 7 days
        else:
            return 14  # Keep differential backups for 14 days
    
    async def _save_backup_metadata(self, backup_job: BackupJob):
        """Save backup metadata to file"""
        metadata_file = self.backup_root / f"metadata_{backup_job.id}.json"
        
        with open(metadata_file, 'w') as f:
            json.dump(asdict(backup_job), f, default=str, indent=2)
    
    async def _load_backup_metadata(self, backup_id: str) -> Optional[BackupJob]:
        """Load backup metadata from file"""
        metadata_file = self.backup_root / f"metadata_{backup_id}.json"
        
        if not metadata_file.exists():
            return None
        
        with open(metadata_file, 'r') as f:
            data = json.load(f)
        
        # Convert string dates back to datetime objects
        data['started_at'] = datetime.fromisoformat(data['started_at'])
        if data['completed_at']:
            data['completed_at'] = datetime.fromisoformat(data['completed_at'])
        
        # Convert enums
        data['backup_type'] = BackupType(data['backup_type'])
        data['status'] = BackupStatus(data['status'])
        
        return BackupJob(**data)
    
    async def _list_all_backups(self) -> List[BackupJob]:
        """List all backup jobs"""
        backups = []
        
        for metadata_file in self.backup_root.glob("metadata_*.json"):
            backup_id = metadata_file.stem.replace("metadata_", "")
            backup = await self._load_backup_metadata(backup_id)
            if backup:
                backups.append(backup)
        
        return sorted(backups, key=lambda x: x.started_at, reverse=True)
    
    async def _get_last_backup_time(self) -> datetime:
        """Get timestamp of last backup"""
        backups = await self._list_all_backups()
        if backups:
            return backups[0].started_at
        return datetime.utcnow() - timedelta(days=30)  # Default to 30 days ago
    
    async def _get_last_full_backup_time(self) -> datetime:
        """Get timestamp of last full backup"""
        backups = await self._list_all_backups()
        full_backups = [b for b in backups if b.backup_type == BackupType.FULL]
        if full_backups:
            return full_backups[0].started_at
        return datetime.utcnow() - timedelta(days=30)

# Global backup manager instance
backup_manager = None

def init_backup_manager(config: Dict[str, Any]) -> BackupManager:
    """Initialize global backup manager"""
    global backup_manager
    backup_manager = BackupManager(config)
    return backup_manager

def get_backup_manager() -> BackupManager:
    """Get global backup manager instance"""
    if backup_manager is None:
        raise RuntimeError("Backup manager not initialized")
    return backup_manager 