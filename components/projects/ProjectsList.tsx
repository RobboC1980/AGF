"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  epics: { count: number }[];
};

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();

    // Set up real-time subscription
    const channel = supabase
      .channel("public:projects")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        (payload) => {
          // Handle different change types
          if (payload.eventType === "INSERT") {
            setProjects((prev) => [payload.new as Project, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setProjects((prev) =>
              prev.map((project) =>
                project.id === payload.new.id
                  ? (payload.new as Project)
                  : project
              )
            );
          } else if (payload.eventType === "DELETE") {
            setProjects((prev) =>
              prev.filter((project) => project.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch projects from the API
  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          epics:epics(count)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setProjects(data as Project[]);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to project details
  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  // Create a new project
  const handleCreateProject = () => {
    router.push("/projects/new");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="space-y-4 w-full max-w-3xl">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 bg-gray-100 animate-pulse rounded-lg h-24"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">Error loading projects: {error}</div>
        <button
          onClick={fetchProjects}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h3 className="text-xl font-medium mb-4">No projects yet</h3>
        <p className="text-gray-500 mb-6">
          Create your first project to get started
        </p>
        <button
          onClick={handleCreateProject}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Project
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Projects</h2>
        <button
          onClick={handleCreateProject}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Project
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleProjectClick(project.id)}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-medium">{project.name}</h3>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  project.status === "active"
                    ? "bg-green-100 text-green-800"
                    : project.status === "archived"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
            </div>

            {project.description && (
              <p className="mt-2 text-gray-600 line-clamp-2">
                {project.description}
              </p>
            )}

            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span>
                {project.epics && project.epics[0]
                  ? `${project.epics[0].count} epics`
                  : "0 epics"}
              </span>
              <span className="mx-2">•</span>
              <span>
                {new Date(project.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 