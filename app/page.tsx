"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { MapComponent } from "@/components/Map";
import { SidePanel } from "@/components/SidePanel";
import { NewLogModal } from "@/components/NewLogModal";
import { Session, LocationGroup, clusterSessionsByLocation, getSessions } from "@/lib/db";
import { signIn, signOut, useSession } from "next-auth/react";
import { Plus, LogIn, LogOut, MapPin } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationGroup | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<{ flyTo: (lat: number, lng: number) => void } | null>(null);

  const user = session?.user;
  const isWhitelisted = user?.isWhitelisted || false;

  // Compute location groups from sessions
  const locationGroups = useMemo(() => {
    return clusterSessionsByLocation(sessions);
  }, [sessions]);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSignIn = () => {
    signIn("google");
  };

  const handleSignOut = () => {
    signOut();
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

  const isAuthenticated = status === "authenticated";
  const isAuthLoading = status === "loading";

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="text-primary" size={24} />
          <h1 className="text-xl font-bold">EV Charging Logbook</h1>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted">{user?.email}</span>
              {!isWhitelisted && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Read-only
                </span>
              )}
              {isWhitelisted && (
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
              )}
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
              disabled={isAuthLoading}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer border-none hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <LogIn size={16} />
              {isAuthLoading ? "Loading..." : "Sign In"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading || isAuthLoading ? (
            <div className="flex items-center justify-center h-full text-muted">
              Loading...
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
            onEdit={isWhitelisted ? handleEditSession : undefined}
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
