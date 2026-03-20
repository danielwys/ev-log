"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { MapComponent } from "@/components/Map";
import { SidePanel } from "@/components/SidePanel";
import { NewLogModal } from "@/components/NewLogModal";
import { supabase, Session, LocationGroup, clusterSessionsByLocation } from "@/lib/supabase";
import { Plus, LogIn, LogOut, MapPin } from "lucide-react";

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationGroup | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<{ flyTo: (lat: number, lng: number) => void } | null>(null);

  // Compute location groups from sessions
  const locationGroups = useMemo(() => {
    return clusterSessionsByLocation(sessions);
  }, [sessions]);

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
    setSelectedLocation(null);
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

  // Click location pin → show Location View in sidebar
  const handleLocationClick = (location: LocationGroup) => {
    setSelectedLocation(location);
    setSelectedSession(null);
  };

  // Click session in list → show Session Detail View
  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
  };

  // Back button → return to Location View
  const handleBackToLocation = () => {
    setSelectedSession(null);
  };

  const handleLocateOnMap = (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng);
  };

  const handleEditSession = (session: Session) => {
    setEditSession(session);
    setIsModalOpen(true);
  };

  const handleCloseSidePanel = () => {
    setSelectedLocation(null);
    setSelectedSession(null);
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
              locationGroups={locationGroups}
              onLocationClick={handleLocationClick}
              onSessionClick={handleSessionSelect}
              selectedLocation={selectedLocation}
              selectedSession={selectedSession}
            />
          )}
        </div>

        {/* Side Panel */}
        {(selectedLocation || selectedSession) && (
          <SidePanel
            location={selectedLocation}
            session={selectedSession}
            onClose={handleCloseSidePanel}
            onLocate={handleLocateOnMap}
            onSessionSelect={handleSessionSelect}
            onBackToLocation={handleBackToLocation}
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
