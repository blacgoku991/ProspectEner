import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Appelé si la scène 3D échoue (contexte WebGL refusé, erreur de rendu…). */
  onError?: (error: unknown) => void;
}

interface State {
  failed: boolean;
}

/** Isole la scène 3D : en cas d'erreur, l'illustration statique reste affichée. */
export class SceneErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[HouseScene] rendu 3D désactivé :", error, info.componentStack);
    }
    this.props.onError?.(error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
