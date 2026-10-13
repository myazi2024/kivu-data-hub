import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CCCIntroDialog from "../CCCIntroDialog";

// TEMP: verifies the rewritten intro paragraph, removed after the run.
describe("CCC intro paragraph (temp)", () => {
  it("renders the new first sentence with the searched number", () => {
    render(
      <CCCIntroDialog
        open
        onOpenChange={vi.fn()}
        onContinue={vi.fn()}
        parcelNumber="355432"
      />,
    );
    const text = screen.getByRole("heading", { name: /À propos de ce service/i })
      .parentElement!.textContent!
      .replace(/\s+/g, " ")
      .trim();
    console.log("PARAGRAPH>>>", text);
    expect(text).toContain(
      "vérification poussée de l'enregistrement d'une parcelle au cadastre numérique",
    );
    expect(text).toContain("355432");
    expect(text).not.toContain("figure-t-elle déjà");
  });
});
