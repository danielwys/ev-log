"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { css } from "@/styled-system/css";
import { MapComponent } from "@/components/Map";
import { SidePanel } from "@/components/SidePanel";
import { NewLogModal } from "@/components/NewLogModal";
import { supabase, Session } from "@/lib/supabase";
import { Plus, LogIn, LogOut, MapPin } from "lucide-react";

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) console.error("Sign in error:", error);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSelectedSession(null);
  };

  const handleSessionCreated = () => {
    fetchSessions();
    setIsModalOpen(false);
  };

  const handleMarkerClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleLocateOnMap = (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng);
  };

  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bg: "background",
        color: "text",
      })}
    >
      {/* Header */}
      <header
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 4,
          py: 3,
          bg: "surface",
          borderBottom: "1px solid",
          borderColor: "gray.700",
        })}
      >
        <div className={css({ display: "flex", alignItems: "center", gap: 2 })}>
          <MapPin className={css({ color: "primary" })} size={24} />
          <h1
            className={css({
              fontSize: "xl",
              fontWeight: "bold",
              color: "text",
            })}
          >
            EV Charging Logbook
          </h1>
        </div>

        <div className={css({ display: "flex", alignItems: "center", gap: 3 })}>
          {user ? (
            <>
              <span
                className={css({
                  fontSize: "sm",
                  color: "muted",
                  display: { base: "none", md: "block" },
                })}
              >
                {user.email}
              </span>
              <button
                onClick={() => setIsModalOpen(true)}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 3,
                  py: 2,
                  bg: "primary",
                  color: "white",
                  borderRadius: "md",
                  fontSize: "sm",
                  fontWeight: "medium",
                  cursor: "pointer",
                  _hover: { bg: "blue.600" },
                  transition: "background 0.2s",
                })}
              >
                <Plus size={16} />
                New Log
              </button>
              <button
                onClick={handleSignOut}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 3,
                  py: 2,
                  bg: "transparent",
                  color: "muted",
                  borderRadius: "md",
                  fontSize: "sm",
                  cursor: "pointer",
                  _hover: { color: "text", bg: "gray.700" },
                  transition: "all 0.2s",
                })}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 3,
                py: 2,
                bg: "primary",
                color: "white",
                borderRadius: "md",
                fontSize: "sm",
                fontWeight: "medium",
                cursor: "pointer",
                _hover: { bg: "blue.600" },
                transition: "background 0.2s",
              })}
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div
        className={css({
          display: "flex",
          flex: 1,
          overflow: "hidden",
        })}
      >
        {/* Map */}
        <div
          className={css({
            flex: 1,
            position: "relative",
          })}
        >
          {isLoading ? (
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "muted",
              })}
            >
              Loading...
            </div>
          ) : !user ? (
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 4,
                color: "muted",
              })}
            >
              <MapPin size={48} className={css({ opacity: 0.5 })} />
              <p className={css({ fontSize: "lg" })}>
                Sign in to view your charging sessions
              </p>
              <button
                onClick={handleSignIn}
                className={css({
                  px: 4,
                  py: 2,
                  bg: "primary",
                  color: "white",
                  borderRadius: "md",
                  fontWeight: "medium",
                  cursor: "pointer",
                  _hover: { bg: "blue.600" },
                })}
              >
                Sign In with Google
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
          />
        )}
      </div>

      {/* New Log Modal */}
      <NewLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSessionCreated}
      />
    </div>
  );
}
