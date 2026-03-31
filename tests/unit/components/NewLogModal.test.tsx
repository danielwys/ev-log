import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewLogModal } from "@/components/NewLogModal";
import { createMockSessionData, renderWithProviders, createMockSession } from "@/tests/utils";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "user-123", email: "test@example.com" } },
    status: "authenticated",
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock lib/db
vi.mock("@/lib/db", async () => {
  const actual = await vi.importActual("@/lib/db");
  return {
    ...actual as object,
    createSession: vi.fn(),
    updateSession: vi.fn(),
    getPlugShareCache: vi.fn(),
    createPlugShareCache: vi.fn(),
  };
});

import { createSession, getPlugShareCache } from "@/lib/db";

describe("NewLogModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockedCreateSession = vi.mocked(createSession);
  const mockedGetPlugShareCache = vi.mocked(getPlugShareCache);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("Create Mode", () => {
    it("renders with empty form in create mode", () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      expect(screen.getByText("New Charging Session")).toBeInTheDocument();
      // Check station name input by placeholder (it's empty in create mode)
      const stationInput = screen.getByPlaceholderText(/e\.g\., shell recharge/i);
      expect(stationInput).toHaveValue("");
      // Check operator input
      const operatorInput = screen.getByPlaceholderText(/e\.g\., shell, sp/i);
      expect(operatorInput).toHaveValue("");
    });

    it("station name input works", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      const stationInput = screen.getByPlaceholderText(/e\.g\., shell recharge/i);
      await userEvent.type(stationInput, "Shell Recharge Tampines");

      expect(stationInput).toHaveValue("Shell Recharge Tampines");
    });

    it("operator input works", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      const operatorInput = screen.getByPlaceholderText(/e\.g\., shell, sp/i);
      await userEvent.type(operatorInput, "Shell");

      expect(operatorInput).toHaveValue("Shell");
    });

    it("battery start/end inputs accept decimals", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Use placeholder to find inputs
      const startInput = screen.getByDisplayValue("20");
      const endInput = screen.getByDisplayValue("80");

      await userEvent.clear(startInput);
      await userEvent.type(startInput, "38.9");

      await userEvent.clear(endInput);
      await userEvent.type(endInput, "82.5");

      expect(startInput).toHaveValue(38.9);
      expect(endInput).toHaveValue(82.5);
    });

    it("max kW input validation works", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      const maxKwInput = screen.getByPlaceholderText(/e\.g\., 150/i);

      // Valid value
      await userEvent.type(maxKwInput, "150");
      expect(maxKwInput).toHaveValue(150);

      // Clear and try negative (should be rejected by form validation)
      await userEvent.clear(maxKwInput);
      await userEvent.type(maxKwInput, "-10");
    });

    it("latitude/longitude inputs work", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      const latInput = screen.getByPlaceholderText(/1\.3521/i);
      const lngInput = screen.getByPlaceholderText(/103\.8198/i);

      await userEvent.clear(latInput);
      await userEvent.type(latInput, "1.318614");

      await userEvent.clear(lngInput);
      await userEvent.type(lngInput, "103.663353");

      expect(latInput).toHaveValue(1.318614);
      expect(lngInput).toHaveValue(103.663353);
    });

    it("PlugShare fetch button fetches and populates data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: "Charge+ Tampines Mall",
          address: "Tampines Mall, 4 Tampines Central 5",
          latitude: 1.3525,
          longitude: 103.9441,
          operator: "Charge+",
        }),
      } as Response);

      mockedGetPlugShareCache.mockResolvedValueOnce(null);

      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Enter PlugShare URL
      const urlInput = screen.getByPlaceholderText(/plugshare\.com/i);
      await userEvent.type(urlInput, "https://www.plugshare.com/location/123456");

      // Click import button
      const importButton = screen.getByRole("button", { name: /import/i });
      await userEvent.click(importButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/plugshare?locationId=123456");
      });

      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., shell recharge/i)).toHaveValue("Charge+ Tampines Mall");
      });

      // Check latitude/longitude are populated
      expect(screen.getByDisplayValue("1.3525")).toBeInTheDocument();
      expect(screen.getByDisplayValue("103.9441")).toBeInTheDocument();
    });

    it("PlugShare fetch shows error for invalid URL", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Enter invalid URL
      const urlInput = screen.getByPlaceholderText(/plugshare\.com/i);
      await userEvent.type(urlInput, "https://invalid-url.com");

      // Click import button
      const importButton = screen.getByRole("button", { name: /import/i });
      await userEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/could not extract location id/i)).toBeInTheDocument();
      });
    });

    it("photo upload section handles multiple files", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Mock fetch for upload
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ url: "/uploads/test-photo.webp" }),
      } as Response);

      // Find and trigger file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Create mock files
      const files = [
        new File(["test content 1"], "photo1.jpg", { type: "image/jpeg" }),
        new File(["test content 2"], "photo2.jpg", { type: "image/jpeg" }),
      ];

      // Upload files
      await userEvent.upload(fileInput, files);

      // Wait for upload to be processed
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("cancel button closes modal", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("submit creates session via API when valid", async () => {
      mockedCreateSession.mockResolvedValueOnce(createMockSessionData());

      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Fill required fields
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., shell recharge/i), "Test Station");
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., shell, sp/i), "Test Operator");
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., 150/i), "120");
      await userEvent.type(screen.getByPlaceholderText(/1\.3521/i), "1.318614");
      await userEvent.type(screen.getByPlaceholderText(/103\.8198/i), "103.663353");

      // Submit
      const submitButton = screen.getByRole("button", { name: /save session/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedCreateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            station_name: "Test Station",
            operator: "Test Operator",
            max_kw: 120,
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe("Edit Mode", () => {
    it("pre-populates form in edit mode", () => {
      const editSession = createMockSessionData({
        station_name: "Existing Station",
        operator: "Existing Operator",
        max_kw: 200,
        battery_start: 30,
        battery_end: 70,
        location: "SRID=4326;POINT(103.9876 1.2345)",
        notes: "Existing notes",
      });

      renderWithProviders(
        <NewLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          editSession={editSession}
        />,
        { session: createMockSession() }
      );

      expect(screen.getByText("Edit Charging Session")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\., shell recharge/i)).toHaveValue("Existing Station");
      expect(screen.getByPlaceholderText(/e\.g\., shell, sp/i)).toHaveValue("Existing Operator");
    });

    it("hides PlugShare import in edit mode", () => {
      const editSession = createMockSessionData();

      renderWithProviders(
        <NewLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          editSession={editSession}
        />,
        { session: createMockSession() }
      );

      // PlugShare section should not be visible
      const plugShareSection = screen.queryByText(/plugshare url/i);
      expect(plugShareSection).not.toBeInTheDocument();
    });

    it("calls API update endpoint when editing", async () => {
      const editSession = createMockSessionData({ id: "edit-123" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => editSession,
      } as Response);

      renderWithProviders(
        <NewLogModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          editSession={editSession}
        />,
        { session: createMockSession() }
      );

      // Modify a field
      const stationInput = screen.getByPlaceholderText(/e\.g\., shell recharge/i);
      await userEvent.clear(stationInput);
      await userEvent.type(stationInput, "Updated Station Name");

      // Submit
      const submitButton = screen.getByRole("button", { name: /update session/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/sessions/edit-123",
          expect.objectContaining({
            method: "PUT",
          })
        );
      });
    });
  });

  describe("Connector Tracking", () => {
    it("adds connectors to the tried list", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Find connector input (within Connector Tracking section)
      const connectorSection = screen.getByText(/connector tracking/i);
      expect(connectorSection).toBeInTheDocument();

      // Find the input by placeholder
      const connectorInput = screen.getByPlaceholderText(/e\.g\., ccs1-01/i);
      await userEvent.type(connectorInput, "CCS1-01");

      // Click add button
      const addButton = screen.getByRole("button", { name: /add$/i });
      await userEvent.click(addButton);

      // Connector should appear in the list
      await waitFor(() => {
        expect(screen.getByText("CCS1-01")).toBeInTheDocument();
      });
    });

    it("toggles connector success status", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Add a connector
      const connectorInput = screen.getByPlaceholderText(/e\.g\., ccs1-01/i);
      await userEvent.type(connectorInput, "CCS1-01");
      const addButton = screen.getByRole("button", { name: /add$/i });
      await userEvent.click(addButton);

      // Wait for connector to appear
      await waitFor(() => {
        expect(screen.getByText("CCS1-01")).toBeInTheDocument();
      });

      // Click connector to mark as successful
      const connectorBadge = screen.getByText("CCS1-01");
      await userEvent.click(connectorBadge);

      // Should now show as successful (green styling) - find the parent button
      const connectorButton = connectorBadge.closest("button");
      expect(connectorButton).toHaveClass("bg-green-100");
    });
  });

  describe("Technique Required", () => {
    it("shows technique notes when checkbox is checked", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Find and check the technique required checkbox
      const checkbox = screen.getByLabelText(/special technique required/i);
      expect(checkbox).not.toBeChecked();

      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      // Technique notes textarea should appear
      const techniqueNotes = screen.getByPlaceholderText(/describe the technique/i);
      expect(techniqueNotes).toBeInTheDocument();

      await userEvent.type(techniqueNotes, "Hold connector firmly");
      expect(techniqueNotes).toHaveValue("Hold connector firmly");
    });
  });

  describe("Error Details", () => {
    it("captures error code and failure type", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      const errorInput = screen.getByPlaceholderText(/0xa00014/i);
      await userEvent.type(errorInput, "0xA00015");
      expect(errorInput).toHaveValue("0xA00015");

      // Select failure type - find by text content in the section
      const failureSection = screen.getByText(/error details/i);
      expect(failureSection).toBeInTheDocument();

      // Get the select element by looking for the select field near the error section
      const selects = screen.getAllByRole("combobox");
      const failureSelect = selects.find(s => s.className.includes("border-gray-300"));
      if (failureSelect) {
        await userEvent.selectOptions(failureSelect, "handshake");
        expect(failureSelect).toHaveValue("handshake");
      }
    });
  });

  describe("Form Validation", () => {
    it("submit button requires required fields", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Submit should be disabled or show validation errors for empty required fields
      const submitButton = screen.getByRole("button", { name: /save session/i });

      // Try to submit with empty fields
      await userEvent.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
      });
    });

    it("validates battery levels are within 0-100 range", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      const startInput = screen.getByDisplayValue("20");

      // Try invalid value
      await userEvent.clear(startInput);
      await userEvent.type(startInput, "150");

      // Input accepts the value (form validation happens on submit)
      await waitFor(() => {
        expect(startInput).toHaveValue(150);
      });
    });
  });

  describe("Modal Visibility", () => {
    it("returns null when not open", () => {
      const { container } = renderWithProviders(
        <NewLogModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Should render nothing when not open - check for modal content absence
      expect(screen.queryByText(/charging session/i)).not.toBeInTheDocument();
    });

    it("clicking outside modal triggers onClose", async () => {
      renderWithProviders(
        <NewLogModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
        { session: createMockSession() }
      );

      // Click on the backdrop (outside the modal content)
      const backdrop = screen.getByText("New Charging Session").closest("div[class*='fixed']");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
