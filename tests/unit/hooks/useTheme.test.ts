import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";
import { mockMatchMedia } from "../../utils/test-utils";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as Storage;

describe("useTheme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia(false);
    document.documentElement.classList.remove("dark", "light");
  });

  it("returns current theme", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBeDefined();
  });

  it("defaults to system theme", () => {
    localStorageMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it("loads theme from localStorage", () => {
    localStorageMock.getItem.mockReturnValue("dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("applies dark class when theme is dark", () => {
    localStorageMock.getItem.mockReturnValue("dark");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies light class when theme is light", () => {
    localStorageMock.getItem.mockReturnValue("light");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("applies dark class when system prefers dark mode", () => {
    localStorageMock.getItem.mockReturnValue("system");
    mockMatchMedia(true); // prefers dark mode
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies light class when system prefers light mode", () => {
    localStorageMock.getItem.mockReturnValue("system");
    mockMatchMedia(false); // prefers light mode
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("changes theme with setTheme", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("persists theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("light");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("updates document class when theme changes", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("removes previous theme class when changing theme", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("listens to system theme changes when theme is system", () => {
    localStorageMock.getItem.mockReturnValue("system");

    const listeners: { [key: string]: (event: { matches: boolean }) => void } =
      {};
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn((event, handler) => {
        listeners[event] = handler;
      }),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { unmount } = renderHook(() => useTheme());

    expect(listeners.change).toBeDefined();

    // Simulate system theme change
    act(() => {
      listeners.change({ matches: true });
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    unmount();
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListener = jest.fn();
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      media: "",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { unmount } = renderHook(() => useTheme());
    unmount();

    expect(removeEventListener).toHaveBeenCalled();
  });

  it("returns setTheme function", () => {
    const { result } = renderHook(() => useTheme());
    expect(typeof result.current.setTheme).toBe("function");
  });

  it("handles invalid theme value gracefully", () => {
    localStorageMock.getItem.mockReturnValue("invalid-theme");
    const { result } = renderHook(() => useTheme());
    // Should fallback to a valid theme
    expect(["light", "dark", "system"]).toContain(result.current.theme);
  });

  it("handles missing localStorage gracefully", () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage not available");
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBeDefined();
  });

  it("updates theme immediately when setTheme is called", () => {
    const { result } = renderHook(() => useTheme());

    const initialTheme = result.current.theme;

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).not.toBe(initialTheme);
    expect(result.current.theme).toBe("dark");
  });

  it("applies correct theme on multiple changes", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setTheme("light");
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);

    act(() => {
      result.current.setTheme("system");
    });
    // Should apply based on system preference
    expect(
      document.documentElement.classList.contains("dark") ||
        document.documentElement.classList.contains("light")
    ).toBe(true);
  });
});
