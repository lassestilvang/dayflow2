import {
  isViewTransitionSupported,
  withViewTransition,
  withThemeTransition,
  withCircularReveal,
} from "@/lib/view-transitions";
import { mockMatchMedia } from "../../utils/test-utils";

describe("view-transitions", () => {
  describe("isViewTransitionSupported", () => {
    it("returns true when View Transition API is supported", () => {
      Object.defineProperty(document, "startViewTransition", {
        writable: true,
        value: jest.fn(),
      });

      expect(isViewTransitionSupported()).toBe(true);
    });

    it("returns false when View Transition API is not supported", () => {
      const original = (
        document as Document & { startViewTransition?: unknown }
      ).startViewTransition;
      delete (document as Document & { startViewTransition?: unknown })
        .startViewTransition;

      expect(isViewTransitionSupported()).toBe(false);

      (
        document as Document & { startViewTransition?: unknown }
      ).startViewTransition = original;
    });

    it("returns false in non-browser environment", () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing non-browser environment
      delete global.document;

      expect(isViewTransitionSupported()).toBe(false);

      global.document = originalDocument;
    });
  });

  describe("withViewTransition", () => {
    it("executes callback when View Transition API is not supported", async () => {
      const original = (
        document as Document & { startViewTransition?: unknown }
      ).startViewTransition;
      delete (document as Document & { startViewTransition?: unknown })
        .startViewTransition;

      const callback = jest.fn();
      await withViewTransition(callback);

      expect(callback).toHaveBeenCalled();

      (
        document as Document & { startViewTransition?: unknown }
      ).startViewTransition = original;
    });

    it("uses View Transition API when supported", async () => {
      const mockTransition = {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };

      const startViewTransition = jest.fn().mockReturnValue(mockTransition);
      Object.defineProperty(document, "startViewTransition", {
        writable: true,
        value: startViewTransition,
      });

      const callback = jest.fn();
      await withViewTransition(callback);

      expect(startViewTransition).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it("handles async callbacks", async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      await withViewTransition(callback);

      expect(callback).toHaveBeenCalled();
    });

    it("handles transition interruption gracefully", async () => {
      const mockTransition = {
        finished: Promise.reject(new Error("Transition interrupted")),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };

      const startViewTransition = jest.fn().mockReturnValue(mockTransition);
      Object.defineProperty(document, "startViewTransition", {
        writable: true,
        value: startViewTransition,
      });

      const callback = jest.fn();
      const consoleWarn = jest.spyOn(console, "warn").mockImplementation();

      await withViewTransition(callback);

      expect(callback).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();

      consoleWarn.mockRestore();
    });
  });

  describe("withThemeTransition", () => {
    beforeEach(() => {
      mockMatchMedia(false);
    });

    it("skips animation when user prefers reduced motion", async () => {
      mockMatchMedia(true);

      const callback = jest.fn();
      await withThemeTransition(callback);

      expect(callback).toHaveBeenCalled();
    });

    it("skips animation when skipMotion option is true", async () => {
      const callback = jest.fn();
      await withThemeTransition(callback, { skipMotion: true });

      expect(callback).toHaveBeenCalled();
    });

    it("uses transition when motion is allowed", async () => {
      const callback = jest.fn();
      await withThemeTransition(callback);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("withCircularReveal", () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockMatchMedia(false);
      mockElement = document.createElement("div");
      Object.defineProperty(mockElement, "getBoundingClientRect", {
        value: jest.fn().mockReturnValue({
          left: 100,
          top: 100,
          width: 50,
          height: 50,
        }),
      });
    });

    it("falls back to theme transition when View Transition not supported", async () => {
      const original = (
        document as Document & { startViewTransition?: unknown }
      ).startViewTransition;
      delete (document as Document & { startViewTransition?: unknown })
        .startViewTransition;

      const callback = jest.fn();
      await withCircularReveal(callback, mockElement);

      expect(callback).toHaveBeenCalled();

      (
        document as Document & { startViewTransition?: unknown }
      ).startViewTransition = original;
    });

    it("falls back when no origin element provided", async () => {
      const callback = jest.fn();
      await withCircularReveal(callback, null);

      expect(callback).toHaveBeenCalled();
    });

    it("skips animation when user prefers reduced motion", async () => {
      mockMatchMedia(true);

      const callback = jest.fn();
      await withCircularReveal(callback, mockElement);

      expect(callback).toHaveBeenCalled();
    });

    it("creates circular reveal animation", async () => {
      const callback = jest.fn();
      const appendChildSpy = jest.spyOn(document.head, "appendChild");
      const removeChildSpy = jest.spyOn(document.head, "removeChild");

      await withCircularReveal(callback, mockElement);

      expect(callback).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it("cleans up style element after transition", async () => {
      const callback = jest.fn();
      const removeChildSpy = jest.spyOn(document.head, "removeChild");

      await withCircularReveal(callback, mockElement);

      expect(removeChildSpy).toHaveBeenCalled();

      removeChildSpy.mockRestore();
    });

    it("calculates correct animation origin from element position", async () => {
      const callback = jest.fn();
      const appendChildSpy = jest.spyOn(document.head, "appendChild");

      await withCircularReveal(callback, mockElement);

      expect(appendChildSpy).toHaveBeenCalled();
      const styleElement = appendChildSpy.mock.calls[0][0] as HTMLStyleElement;
      expect(styleElement.textContent).toContain("125px"); // left + width/2
      expect(styleElement.textContent).toContain("125px"); // top + height/2

      appendChildSpy.mockRestore();
    });
  });
});
