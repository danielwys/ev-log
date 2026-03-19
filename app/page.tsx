"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapComponent } from "@/components/Map";
import { SidePanel } from "@/components/SidePanel";
import { NewLogModal } from "@/components/NewLogModal";
import { supabase, Session } from "@/lib/supabase";
import { Plus, LogIn, LogOut, MapPin } from "lucide-react";

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<{ flyTo: (lat: number, lng: number) => void } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setIsLoading(false);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
      return;
    }

    setSessions(data || []);
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSignIn = async () => {
    const email = prompt("Enter your email for magic link sign-in:");
    if (!email) return;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) {
      console.error("Sign in error:", error);
      alert("Error: " + error.message);
    } else {
      alert("Check your email (or Mailpit at http://127.0.0.1:54324) for the magic link!");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSelectedSession(null);
  };

  const handleSessionCreated = () => {
    fetchSessions();
    setIsModalOpen(false);
    setEditSession(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditSession(null);
  };

  const handleMarkerClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleLocateOnMap = (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng);
  };

  const handleEditSession = (session: Session) => {
    setEditSession(session);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="text-primary" size={24} />
          <h1 className="text-xl font-bold">EV Charging Logbook</h1>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted">{user.email}</span>
              <button
                onClick={() => {
                  setEditSession(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer border-none hover:bg-blue-600 transition-colors"
              >
                <Plus size={16} />
                New Log
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 px-3 py-2 bg-transparent text-muted rounded-md text-sm cursor-pointer border border-border hover:bg-gray-100 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer border-none hover:bg-blue-600 transition-colors"
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted">
              Loading...
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
              <MapPin size={48} className="opacity-50" />
              <p className="text-lg">Sign in to view your charging sessions</p>
              <button
                onClick={handleSignIn}
                className="px-4 py-2 bg-primary text-white rounded-md font-medium cursor-pointer border-none hover:bg-blue-600 transition-colors"
              >
                Sign In with Email
              </button>
            </div>
          ) : (
            <MapComponent
              ref={mapRef}
              sessions={sessions}
              onMarkerClick={handleMarkerClick}
              selectedSession={selectedSession}
            />
          )}
        </div>

        {/* Side Panel */}
        {selectedSession && (
          <SidePanel
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onLocate={handleLocateOnMap}
            onEdit={handleEditSession}
            currentUserId={user?.id}
          />
        )}
      </div>

      {/* New Log / Edit Modal */}
      <NewLogModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSessionCreated}
        editSession={editSession}
      />
    </div>
  );
}
