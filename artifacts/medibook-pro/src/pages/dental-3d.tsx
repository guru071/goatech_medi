import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import Layout from "@/components/Layout";
import WebGLErrorBoundary from "@/components/WebGLErrorBoundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type ToothCondition = "healthy" | "cavity" | "root_canal" | "implant" | "missing";

interface ToothData {
  id: number;
  name: string;
  position: [number, number, number];
  condition: ToothCondition;
  description: string;
}

const CONDITIONS: Record<ToothCondition, { label: string; color: string; description: string; recommendation: string }> = {
  healthy: { label: "Healthy", color: "#f5f0e8", description: "This tooth is in excellent condition.", recommendation: "Continue regular brushing and flossing. Visit every 6 months." },
  cavity: { label: "Cavity Detected", color: "#8B4513", description: "Dental caries detected on the tooth surface.", recommendation: "Schedule a filling appointment at a dental clinic as soon as possible." },
  root_canal: { label: "Root Canal Needed", color: "#FF6B35", description: "Pulp infection detected — root canal therapy required.", recommendation: "Urgent: Book with a specialist endodontist immediately." },
  implant: { label: "Implant Recommended", color: "#4A90D9", description: "Tooth loss present. Implant is the best long-term solution.", recommendation: "Consult an oral surgeon for implant evaluation." },
  missing: { label: "Missing Tooth", color: "#CCCCCC", description: "Tooth is absent from the arch.", recommendation: "Options: implant, bridge, or denture. Book a consultation." },
};

function generateTeeth(): ToothData[] {
  const teeth: ToothData[] = [];
  const conditions: ToothCondition[] = ["healthy", "cavity", "healthy", "root_canal", "healthy", "healthy", "implant", "healthy"];
  
  // Upper arch (8 teeth per side mirrored)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 7) * Math.PI;
    const r = 2.2;
    const x = r * Math.cos(Math.PI - angle) * 0.9;
    const z = r * Math.sin(Math.PI - angle) * 0.5;
    teeth.push({
      id: i + 1,
      name: `Upper ${["Central Incisor", "Lateral Incisor", "Canine", "1st Premolar", "2nd Premolar", "1st Molar", "2nd Molar", "3rd Molar"][i]}`,
      position: [x, 0.6, z],
      condition: conditions[i],
      description: CONDITIONS[conditions[i]].description,
    });
  }

  // Lower arch (8 teeth)
  const lowerConditions: ToothCondition[] = ["healthy", "healthy", "cavity", "healthy", "healthy", "missing", "healthy", "healthy"];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 7) * Math.PI;
    const r = 2.0;
    const x = r * Math.cos(Math.PI - angle) * 0.9;
    const z = r * Math.sin(Math.PI - angle) * 0.5;
    teeth.push({
      id: i + 9,
      name: `Lower ${["Central Incisor", "Lateral Incisor", "Canine", "1st Premolar", "2nd Premolar", "1st Molar", "2nd Molar", "3rd Molar"][i]}`,
      position: [x, -0.6, z],
      condition: lowerConditions[i],
      description: CONDITIONS[lowerConditions[i]].description,
    });
  }

  return teeth;
}

const TEETH_DATA = generateTeeth();

function Tooth({
  tooth, selected, beforeAfter, onClick
}: {
  tooth: ToothData;
  selected: boolean;
  beforeAfter: "before" | "after";
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const condition = CONDITIONS[tooth.condition];

  useFrame((_, delta) => {
    if (meshRef.current && selected) {
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  const color = beforeAfter === "after" ? "#FFFFF0" : condition.color;
  const emissiveIntensity = selected ? 0.4 : tooth.condition === "healthy" ? 0 : 0.15;

  const isSmallTooth = tooth.id === 1 || tooth.id === 2 || tooth.id === 9 || tooth.id === 10;
  const scale: [number, number, number] = isSmallTooth ? [0.22, 0.35, 0.2] : [0.28, 0.32, 0.24];

  return (
    <group position={tooth.position}>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={scale} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#ffffff" : tooth.condition !== "healthy" && beforeAfter === "before" ? condition.color : "#000000"}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.05}
        />
      </mesh>
      {selected && (
        <Html distanceFactor={10} center style={{ pointerEvents: "none" }}>
          <div className="bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
            #{tooth.id}
          </div>
        </Html>
      )}
    </group>
  );
}

function DentalScene({ selectedId, beforeAfter, onSelect }: {
  selectedId: number | null;
  beforeAfter: "before" | "after";
  onSelect: (id: number) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#b4e4ff" />

      {TEETH_DATA.map(tooth => (
        <Tooth
          key={tooth.id}
          tooth={tooth}
          selected={selectedId === tooth.id}
          beforeAfter={beforeAfter}
          onClick={() => onSelect(tooth.id)}
        />
      ))}

      {/* Jaw outline */}
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[1.8, 0.08, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#e8d5c4" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.6, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[1.6, 0.07, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#e8d5c4" roughness={0.7} />
      </mesh>

      <OrbitControls enablePan={false} minDistance={4} maxDistance={10} makeDefault />
    </>
  );
}

export default function Dental3DPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [beforeAfter, setBeforeAfter] = useState<"before" | "after">("before");
  const selectedTooth = TEETH_DATA.find(t => t.id === selectedId);
  const condition = selectedTooth ? CONDITIONS[selectedTooth.condition] : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">3D Dental Viewer</h1>
          <p className="text-muted-foreground text-sm">Interactive tooth model — click any tooth to see details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Canvas */}
          <div className="lg:col-span-2 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl overflow-hidden relative" style={{ height: "480px" }}>
            {/* Before/After Toggle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm rounded-full p-1 flex gap-1">
              <button
                onClick={() => setBeforeAfter("before")}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", beforeAfter === "before" ? "bg-white text-black" : "text-white/70 hover:text-white")}
              >
                Before
              </button>
              <button
                onClick={() => setBeforeAfter("after")}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", beforeAfter === "after" ? "bg-white text-black" : "text-white/70 hover:text-white")}
              >
                After Whitening
              </button>
            </div>

            {/* Controls hint */}
            <div className="absolute bottom-4 left-4 z-10 text-white/50 text-xs">
              Drag to rotate · Scroll to zoom · Click a tooth
            </div>

            <WebGLErrorBoundary>
              <Canvas camera={{ position: [0, 1, 7], fov: 45 }}>
                <Suspense fallback={null}>
                  <DentalScene
                    selectedId={selectedId}
                    beforeAfter={beforeAfter}
                    onSelect={setSelectedId}
                  />
                </Suspense>
              </Canvas>
            </WebGLErrorBoundary>
          </div>

          {/* Info Panel */}
          <div className="flex flex-col gap-4">
            {selectedTooth && condition ? (
              <div className="bg-card border rounded-2xl p-5 animate-slide-up">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{selectedTooth.name}</h3>
                    <p className="text-sm text-muted-foreground">Tooth #{selectedTooth.id}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow" style={{ background: condition.color }} />
                </div>

                <Badge className={cn(
                  "mb-3 text-xs",
                  selectedTooth.condition === "healthy" ? "bg-green-100 text-green-800" :
                  selectedTooth.condition === "cavity" ? "bg-amber-100 text-amber-800" :
                  selectedTooth.condition === "root_canal" ? "bg-orange-100 text-orange-800" :
                  selectedTooth.condition === "implant" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {condition.label}
                </Badge>

                <p className="text-sm mb-2">{condition.description}</p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                  <p className="text-xs font-semibold text-primary mb-1">Recommendation</p>
                  <p className="text-sm">{condition.recommendation}</p>
                </div>

                {selectedTooth.condition !== "healthy" && (
                  <Link href="/clinics?category=dental">
                    <Button className="w-full" size="sm">Book Dental Appointment</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-card border rounded-2xl p-5 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl">🦷</span>
                </div>
                <h3 className="font-semibold">Click a Tooth</h3>
                <p className="text-sm text-muted-foreground">Select any tooth in the 3D model to see its condition, diagnosis, and treatment recommendations.</p>
              </div>
            )}

            {/* Legend */}
            <div className="bg-card border rounded-2xl p-4">
              <h4 className="font-semibold text-sm mb-3">Condition Legend</h4>
              <div className="space-y-2">
                {Object.entries(CONDITIONS).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2.5 text-xs">
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0" style={{ background: val.color }} />
                    <span className="font-medium">{val.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-primary/10 to-teal-100 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold mb-1">Need a Dental Check-up?</p>
              <p className="text-xs text-muted-foreground mb-3">Find verified dental clinics near you</p>
              <Link href="/clinics?category=dental">
                <Button size="sm" className="w-full">Find Dental Clinics</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
