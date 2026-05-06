import { Component, ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl text-white">
          <span className="text-6xl mb-4">🦷</span>
          <h3 className="text-xl font-bold mb-2">3D Viewer Not Available</h3>
          <p className="text-white/60 text-sm mb-4 max-w-xs">
            Your browser or environment doesn't support WebGL. Please open this page in a modern desktop browser for the full 3D experience.
          </p>
          <Link href="/clinics?category=dental">
            <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Find Dental Clinics Instead
            </Button>
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
