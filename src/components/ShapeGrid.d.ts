// Type declarations for the ShapeGrid canvas component.
// Provides prop types for the JSX component used in the hero section.

declare module "./components/ShapeGrid";

interface ShapeGridProps {
  direction?: "left" | "right" | "up" | "down" | "diagonal";
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  shape?: "square" | "hexagon" | "triangle" | "circle";
  hoverTrailAmount?: number;
  hoverColor?: string;
  size?: number;
  className?: string;
}

declare const ShapeGrid: React.FC<ShapeGridProps>;

export default ShapeGrid;
