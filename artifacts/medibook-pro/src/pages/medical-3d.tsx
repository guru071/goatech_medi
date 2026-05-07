import { useRef, useState, Suspense, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// Detect WebGL support BEFORE mounting any Canvas (prevents Vite overlay)
function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function WebGLFallback({ organName, organIcon, category }: { organName: string; organIcon: string; category: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-8 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl text-white">
      <span className="text-7xl mb-5">{organIcon}</span>
      <h3 className="text-xl font-bold mb-2">3D Viewer Unavailable</h3>
      <p className="text-white/60 text-sm mb-2 max-w-sm">
        Your browser or environment doesn't support WebGL rendering.<br />
        Open this page in a modern desktop browser (Chrome, Firefox, Edge) for the full interactive 3D experience.
      </p>
      <p className="text-white/40 text-xs mb-6">
        The 3D Atlas works on any modern laptop or desktop — try opening your published app URL directly.
      </p>
      <Link href={`/clinics?category=${category}`}>
        <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
          Find {organName} Specialists Instead →
        </Button>
      </Link>
    </div>
  );
}

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Condition { id: string; label: string; color: string; description: string; recommendation: string; severity: "healthy"|"mild"|"moderate"|"severe" }
interface OrganPart { id: string; label: string; color: string; conditions: Condition[] }
interface OrganSystem {
  id: string; name: string; icon: string; category: string;
  description: string; parts: OrganPart[];
  cameraPos: [number,number,number]; defaultCondition: string;
}

/* ─── Organ Data ─────────────────────────────────────────────────────────── */
const ORGAN_SYSTEMS: OrganSystem[] = [
  {
    id: "tooth", name: "Dental", icon: "🦷", category: "dental",
    description: "Interactive molar cross-section with root anatomy",
    cameraPos: [0, 1, 6],
    defaultCondition: "healthy",
    parts: [
      { id: "enamel", label: "Enamel", color: "#f5f0e8",
        conditions: [
          { id: "healthy", label: "Healthy Enamel", color: "#f5f0e8", description: "Enamel is intact and strong.", recommendation: "Brush twice daily with fluoride toothpaste.", severity: "healthy" },
          { id: "erosion", label: "Enamel Erosion", color: "#c8b99a", description: "Enamel has thinned due to acid exposure.", recommendation: "Use anti-sensitivity toothpaste. Visit a dentist.", severity: "mild" },
        ]
      },
      { id: "dentin", label: "Dentin", color: "#e8d5a3",
        conditions: [
          { id: "healthy", label: "Healthy Dentin", color: "#e8d5a3", description: "Dentin is well-protected by enamel.", recommendation: "Maintain regular dental check-ups.", severity: "healthy" },
          { id: "cavity", label: "Deep Cavity", color: "#8B4513", description: "Caries has reached the dentin layer.", recommendation: "Composite filling required. Book dental appointment.", severity: "moderate" },
        ]
      },
      { id: "pulp", label: "Pulp Chamber", color: "#e87c7c",
        conditions: [
          { id: "healthy", label: "Healthy Pulp", color: "#e87c7c", description: "Pulp is vital and pain-free.", recommendation: "Regular check-ups every 6 months.", severity: "healthy" },
          { id: "infected", label: "Pulp Infection", color: "#8B0000", description: "Bacterial infection of the pulp tissue.", recommendation: "Root canal therapy needed urgently.", severity: "severe" },
        ]
      },
      { id: "root", label: "Root", color: "#d4c08a",
        conditions: [
          { id: "healthy", label: "Healthy Root", color: "#d4c08a", description: "Root and periodontal ligament are healthy.", recommendation: "Maintain good oral hygiene.", severity: "healthy" },
          { id: "abscess", label: "Periapical Abscess", color: "#5c3d00", description: "Pus-filled pocket at root tip due to infection.", recommendation: "Emergency root canal and antibiotic course needed.", severity: "severe" },
        ]
      },
    ]
  },
  {
    id: "eye", name: "Eye", icon: "👁", category: "eye",
    description: "Full anterior and posterior segment of the human eye",
    cameraPos: [0, 0, 7],
    defaultCondition: "healthy",
    parts: [
      { id: "cornea", label: "Cornea", color: "#a8d8ea",
        conditions: [
          { id: "healthy", label: "Clear Cornea", color: "#a8d8ea", description: "Cornea is transparent and perfectly curved.", recommendation: "Annual eye exam recommended.", severity: "healthy" },
          { id: "keratoconus", label: "Keratoconus", color: "#7ab3cc", description: "Cornea is thinning and bulging outward cone-shaped.", recommendation: "Consult ophthalmologist for corneal cross-linking.", severity: "moderate" },
        ]
      },
      { id: "iris", label: "Iris & Lens", color: "#4a7fa5",
        conditions: [
          { id: "healthy", label: "Clear Lens", color: "#4a7fa5", description: "Lens is clear and focusing correctly.", recommendation: "Regular eye exams every 2 years.", severity: "healthy" },
          { id: "cataract", label: "Cataract", color: "#c8c8c8", description: "Lens has become cloudy, causing blurred vision.", recommendation: "Cataract surgery (phacoemulsification) recommended.", severity: "moderate" },
        ]
      },
      { id: "retina", label: "Retina", color: "#c0392b",
        conditions: [
          { id: "healthy", label: "Healthy Retina", color: "#c0392b", description: "Retinal layers are intact with no tears.", recommendation: "Protect eyes from UV. Annual check-up.", severity: "healthy" },
          { id: "detachment", label: "Retinal Detachment", color: "#7f1d1d", description: "Retina has separated from underlying layers.", recommendation: "Emergency ophthalmological surgery required!", severity: "severe" },
        ]
      },
      { id: "optic_nerve", label: "Optic Nerve", color: "#f39c12",
        conditions: [
          { id: "healthy", label: "Healthy Optic Disc", color: "#f39c12", description: "Normal cup-to-disc ratio. IOP is normal.", recommendation: "Maintain healthy blood pressure.", severity: "healthy" },
          { id: "glaucoma", label: "Glaucoma", color: "#b7800a", description: "Elevated IOP causing optic nerve damage.", recommendation: "Book with glaucoma specialist. Eye drops therapy.", severity: "moderate" },
        ]
      },
    ]
  },
  {
    id: "ear", name: "Ear", icon: "👂", category: "ent",
    description: "Complete ear anatomy: outer, middle, and inner ear",
    cameraPos: [0, 0, 8],
    defaultCondition: "healthy",
    parts: [
      { id: "eardrum", label: "Eardrum (Tympanic Membrane)", color: "#f0c4a0",
        conditions: [
          { id: "healthy", label: "Intact Eardrum", color: "#f0c4a0", description: "Eardrum vibrates normally. No perforations.", recommendation: "Avoid inserting objects into ear canal.", severity: "healthy" },
          { id: "perforation", label: "Tympanic Perforation", color: "#c0683c", description: "Tear in the eardrum causing hearing loss.", recommendation: "ENT consultation. Myringoplasty may be needed.", severity: "moderate" },
        ]
      },
      { id: "ossicles", label: "Ossicles (Malleus/Incus/Stapes)", color: "#e8d0b0",
        conditions: [
          { id: "healthy", label: "Mobile Ossicles", color: "#e8d0b0", description: "Sound transmission chain functioning perfectly.", recommendation: "Regular hearing tests.", severity: "healthy" },
          { id: "otosclerosis", label: "Otosclerosis", color: "#a07040", description: "Abnormal bone growth fixing the stapes.", recommendation: "Stapedectomy surgery or hearing aid.", severity: "moderate" },
        ]
      },
      { id: "cochlea", label: "Cochlea (Inner Ear)", color: "#7ec8a0",
        conditions: [
          { id: "healthy", label: "Healthy Cochlea", color: "#7ec8a0", description: "Hair cells intact. Hearing range 20Hz–20kHz.", recommendation: "Protect from loud noise (>85dB).", severity: "healthy" },
          { id: "sensorineural", label: "Sensorineural Loss", color: "#3a8050", description: "Hair cell damage causing permanent hearing loss.", recommendation: "Audiologist assessment. Hearing aid or cochlear implant.", severity: "severe" },
        ]
      },
    ]
  },
  {
    id: "heart", name: "Heart", icon: "❤️", category: "cardiology",
    description: "Four-chamber heart with major vessels",
    cameraPos: [0, 0, 8],
    defaultCondition: "healthy",
    parts: [
      { id: "left_ventricle", label: "Left Ventricle", color: "#e74c3c",
        conditions: [
          { id: "healthy", label: "Normal LV", color: "#e74c3c", description: "Ejection fraction 55–70%. Wall motion normal.", recommendation: "Maintain active lifestyle and healthy diet.", severity: "healthy" },
          { id: "hypertrophy", label: "LV Hypertrophy", color: "#922b21", description: "Left ventricular wall thickening due to pressure overload.", recommendation: "Cardiology consult. BP management required.", severity: "moderate" },
        ]
      },
      { id: "right_ventricle", label: "Right Ventricle", color: "#e88080",
        conditions: [
          { id: "healthy", label: "Normal RV", color: "#e88080", description: "RV pressure and function are normal.", recommendation: "Regular ECG after age 40.", severity: "healthy" },
          { id: "failure", label: "RV Failure", color: "#943c3c", description: "RV cannot pump sufficient blood to the lungs.", recommendation: "Emergency cardiology care. Echocardiogram needed.", severity: "severe" },
        ]
      },
      { id: "coronary", label: "Coronary Arteries", color: "#f5a623",
        conditions: [
          { id: "healthy", label: "Patent Arteries", color: "#f5a623", description: "Coronary arteries are wide open. No plaques.", recommendation: "Low-fat diet, no smoking, regular exercise.", severity: "healthy" },
          { id: "blockage", label: "Coronary Artery Disease", color: "#a04010", description: "Atherosclerotic plaques narrowing the arteries (>70% stenosis).", recommendation: "Angioplasty/stenting or CABG surgery urgently.", severity: "severe" },
        ]
      },
      { id: "valves", label: "Heart Valves", color: "#f0a0a0",
        conditions: [
          { id: "healthy", label: "Normal Valves", color: "#f0a0a0", description: "All four valves open and close properly.", recommendation: "Dental hygiene prevents valve infections.", severity: "healthy" },
          { id: "regurgitation", label: "Valve Regurgitation", color: "#b04040", description: "Valve leaks, causing blood to flow backward.", recommendation: "Echocardiogram. Valve repair/replacement consult.", severity: "moderate" },
        ]
      },
    ]
  },
  {
    id: "spine", name: "Spine", icon: "🦴", category: "orthopedic",
    description: "Lumbar spine L1–L5 with discs and nerve roots",
    cameraPos: [3, 0, 8],
    defaultCondition: "healthy",
    parts: [
      { id: "vertebra", label: "Vertebral Bodies", color: "#e0d4c0",
        conditions: [
          { id: "healthy", label: "Normal Vertebrae", color: "#e0d4c0", description: "Bone density is normal. No fractures or deformity.", recommendation: "Calcium and Vitamin D supplementation. Core exercises.", severity: "healthy" },
          { id: "fracture", label: "Compression Fracture", color: "#8a6040", description: "Vertebral body has collapsed due to trauma or osteoporosis.", recommendation: "Orthopedic consult. Vertebroplasty may be indicated.", severity: "severe" },
        ]
      },
      { id: "disc", label: "Intervertebral Discs", color: "#80b4d0",
        conditions: [
          { id: "healthy", label: "Healthy Disc", color: "#80b4d0", description: "Disc height maintained. Nucleus pulposus hydrated.", recommendation: "Maintain posture. Avoid heavy lifting.", severity: "healthy" },
          { id: "herniation", label: "Disc Herniation", color: "#305880", description: "Nucleus pulposus has protruded and is compressing a nerve root.", recommendation: "Physiotherapy and pain management. Surgery if conservative fails.", severity: "moderate" },
        ]
      },
      { id: "nerve", label: "Nerve Roots", color: "#f5d76e",
        conditions: [
          { id: "healthy", label: "Free Nerve Roots", color: "#f5d76e", description: "No compression. Normal sensation and reflexes.", recommendation: "Maintain spinal health with stretching.", severity: "healthy" },
          { id: "stenosis", label: "Spinal Stenosis", color: "#a08000", description: "Spinal canal narrowed, compressing multiple nerve roots.", recommendation: "Laminectomy decompression surgery consultation.", severity: "severe" },
        ]
      },
    ]
  },
  {
    id: "knee", name: "Knee Joint", icon: "🦵", category: "orthopedic",
    description: "Full knee joint with ligaments, cartilage & meniscus",
    cameraPos: [3, 0, 9],
    defaultCondition: "healthy",
    parts: [
      { id: "cartilage", label: "Articular Cartilage", color: "#a8e6cf",
        conditions: [
          { id: "healthy", label: "Intact Cartilage", color: "#a8e6cf", description: "Smooth cartilage surface. No wear or thinning.", recommendation: "Low-impact exercises. Maintain healthy weight.", severity: "healthy" },
          { id: "arthritis", label: "Osteoarthritis", color: "#608060", description: "Cartilage has worn away, causing bone-on-bone contact.", recommendation: "Physiotherapy and intra-articular injections. TKR consult.", severity: "severe" },
        ]
      },
      { id: "meniscus", label: "Meniscus", color: "#d4f0d4",
        conditions: [
          { id: "healthy", label: "Intact Meniscus", color: "#d4f0d4", description: "Both medial and lateral menisci are intact.", recommendation: "Warm up before exercise. Avoid deep knee bends.", severity: "healthy" },
          { id: "tear", label: "Meniscal Tear", color: "#608060", description: "Torn meniscus causing locking, pain and swelling.", recommendation: "Arthroscopic meniscus repair or partial meniscectomy.", severity: "moderate" },
        ]
      },
      { id: "ligament", label: "ACL / PCL", color: "#f8d7a0",
        conditions: [
          { id: "healthy", label: "Intact Ligaments", color: "#f8d7a0", description: "All four knee ligaments intact and functional.", recommendation: "Strengthen quadriceps and hamstrings regularly.", severity: "healthy" },
          { id: "acl_tear", label: "ACL Tear", color: "#b08030", description: "Anterior cruciate ligament ruptured (Grade III).", recommendation: "ACL reconstruction surgery followed by physiotherapy.", severity: "severe" },
        ]
      },
    ]
  },
  {
    id: "brain", name: "Brain", icon: "🧠", category: "general",
    description: "Brain anatomy with major lobes and structures",
    cameraPos: [0, 1, 8],
    defaultCondition: "healthy",
    parts: [
      { id: "cerebrum", label: "Cerebrum", color: "#e8a090",
        conditions: [
          { id: "healthy", label: "Healthy Cerebrum", color: "#e8a090", description: "No lesions, tumors or atrophy detected.", recommendation: "Mental exercises, adequate sleep, omega-3 diet.", severity: "healthy" },
          { id: "stroke", label: "Ischemic Stroke", color: "#802010", description: "Blockage of blood supply to a cerebral region.", recommendation: "Emergency thrombolysis within 4.5 hours of onset.", severity: "severe" },
        ]
      },
      { id: "cerebellum", label: "Cerebellum", color: "#f0b080",
        conditions: [
          { id: "healthy", label: "Normal Cerebellum", color: "#f0b080", description: "Coordination and balance functions normal.", recommendation: "Regular balance exercises.", severity: "healthy" },
          { id: "atrophy", label: "Cerebellar Atrophy", color: "#905030", description: "Shrinkage of the cerebellum causing ataxia.", recommendation: "Neurology specialist referral for management.", severity: "moderate" },
        ]
      },
      { id: "ventricles", label: "Ventricles / CSF", color: "#a0d0f0",
        conditions: [
          { id: "healthy", label: "Normal CSF", color: "#a0d0f0", description: "Ventricular size normal. CSF flowing freely.", recommendation: "Stay hydrated. Avoid head trauma.", severity: "healthy" },
          { id: "hydrocephalus", label: "Hydrocephalus", color: "#4060a0", description: "CSF build-up causing ventricular enlargement.", recommendation: "Ventriculoperitoneal shunt insertion consult.", severity: "severe" },
        ]
      },
    ]
  },
  {
    id: "lung", name: "Lungs", icon: "🫁", category: "general",
    description: "Right and left lung with bronchial tree",
    cameraPos: [0, 1, 10],
    defaultCondition: "healthy",
    parts: [
      { id: "alveoli", label: "Alveoli", color: "#b0e0b0",
        conditions: [
          { id: "healthy", label: "Healthy Alveoli", color: "#b0e0b0", description: "Gas exchange at 95%+ efficiency. No consolidation.", recommendation: "No smoking. Annual chest X-ray after 40.", severity: "healthy" },
          { id: "pneumonia", label: "Pneumonia", color: "#507050", description: "Alveoli filled with fluid and inflammatory cells.", recommendation: "Antibiotics + supportive care. Monitor oxygen saturation.", severity: "moderate" },
        ]
      },
      { id: "bronchi", label: "Bronchi / Airways", color: "#80c0e0",
        conditions: [
          { id: "healthy", label: "Clear Airways", color: "#80c0e0", description: "Airways open with normal mucociliary clearance.", recommendation: "Avoid dust, pollution and allergens.", severity: "healthy" },
          { id: "asthma", label: "Asthma / COPD", color: "#305070", description: "Bronchospasm and airway inflammation reducing airflow.", recommendation: "Bronchodilator inhalers and corticosteroids.", severity: "moderate" },
        ]
      },
      { id: "pleura", label: "Pleura", color: "#d0f0d0",
        conditions: [
          { id: "healthy", label: "Normal Pleura", color: "#d0f0d0", description: "Pleural space contains only a thin film of fluid.", recommendation: "Maintain chest health, annual check-up.", severity: "healthy" },
          { id: "effusion", label: "Pleural Effusion", color: "#608060", description: "Excess fluid in the pleural space compressing the lung.", recommendation: "Thoracocentesis (drainage) and underlying cause treatment.", severity: "moderate" },
        ]
      },
    ]
  },
];

/* ─── 3D Models ──────────────────────────────────────────────────────────── */

function ToothModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.3; });

  const crownPts = useMemo(() => [
    new THREE.Vector2(0, -2.4), new THREE.Vector2(0.22, -2.4),
    new THREE.Vector2(0.55, -1.8), new THREE.Vector2(0.7, -0.8),
    new THREE.Vector2(0.85, 0.2), new THREE.Vector2(0.92, 0.8),
    new THREE.Vector2(1.0, 1.4), new THREE.Vector2(1.05, 1.9),
    new THREE.Vector2(0.98, 2.4), new THREE.Vector2(0.82, 2.8),
    new THREE.Vector2(0.6, 3.1), new THREE.Vector2(0.3, 3.3),
    new THREE.Vector2(0, 3.3),
  ], []);

  const getColor = (partId: string, defaultColor: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return defaultColor;
    const part = ORGAN_SYSTEMS[0].parts.find(p => p.id === partId);
    return part?.conditions.find(c => c.id === cond)?.color || defaultColor;
  };

  return (
    <group ref={group}>
      {/* Crown - Enamel */}
      <mesh onClick={() => onSelect("enamel")} castShadow>
        <latheGeometry args={[crownPts, 32]} />
        <meshPhysicalMaterial color={getColor("enamel","#f5f0e8")} roughness={0.15} metalness={0} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      {/* Dentin layer inside */}
      <mesh onClick={() => onSelect("dentin")} castShadow>
        <latheGeometry args={[crownPts.map(v => new THREE.Vector2(v.x * 0.72, v.y)), 32]} />
        <meshStandardMaterial color={getColor("dentin","#e8d5a3")} roughness={0.5} />
      </mesh>
      {/* Pulp chamber */}
      <mesh position={[0, 0.6, 0]} onClick={() => onSelect("pulp")} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={getColor("pulp","#e87c7c")} roughness={0.7} />
      </mesh>
      {/* Roots */}
      {[[-0.3, -2.2, 0, 0.1], [0.3, -2.2, 0, -0.1], [0, -2.2, 0.25, 0]].map(([x, y, z, rx], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} rotation={[rx as number, 0, 0]} onClick={() => onSelect("root")} castShadow>
          <coneGeometry args={[0.22, 1.6, 12]} />
          <meshStandardMaterial color={getColor("root","#d4c08a")} roughness={0.6} />
        </mesh>
      ))}
      {/* Root canal inside */}
      {[[-0.3, -2.2, 0], [0.3, -2.2, 0], [0, -2.2, 0.25]].map(([x, y, z], i) => (
        <mesh key={i} position={[x as number, y as number + 0.2, z as number]} castShadow>
          <coneGeometry args={[0.06, 1.2, 8]} />
          <meshStandardMaterial color="#e87c7c" roughness={0.8} />
        </mesh>
      ))}
      {/* Highlight selected */}
      {selectedPart && (
        <Html center distanceFactor={8}>
          <div className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap">
            {ORGAN_SYSTEMS[0].parts.find(p => p.id === selectedPart)?.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function EyeModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.25; });
  const getColor = (partId: string, d: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return d;
    return ORGAN_SYSTEMS[1].parts.find(p => p.id === partId)?.conditions.find(c => c.id === cond)?.color || d;
  };
  return (
    <group ref={group}>
      {/* Sclera (white) */}
      <mesh castShadow>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshStandardMaterial color="#f8f4f0" roughness={0.3} metalness={0.05} />
      </mesh>
      {/* Cornea (front transparent dome) */}
      <mesh position={[0, 0, 1.9]} onClick={() => onSelect("cornea")} castShadow>
        <sphereGeometry args={[0.9, 32, 16, 0, Math.PI * 2, 0, 0.7]} />
        <meshPhysicalMaterial color={getColor("cornea","#d0eaf5")} roughness={0.05} metalness={0} transparent opacity={0.45} transmission={0.7} />
      </mesh>
      {/* Iris */}
      <mesh position={[0, 0, 1.7]} onClick={() => onSelect("iris")} castShadow>
        <ringGeometry args={[0.28, 0.82, 48]} />
        <meshStandardMaterial color={getColor("iris","#3d7fbf")} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Pupil */}
      <mesh position={[0, 0, 1.72]}>
        <circleGeometry args={[0.28, 32]} />
        <meshStandardMaterial color="#050505" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 0, 1.4]} onClick={() => onSelect("iris")}>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshPhysicalMaterial color={getColor("iris","#c8e0f0")} roughness={0.1} transparent opacity={0.35} transmission={0.8} />
      </mesh>
      {/* Vitreous body */}
      <mesh>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshPhysicalMaterial color="#d8eef8" roughness={0.05} transparent opacity={0.12} transmission={0.9} />
      </mesh>
      {/* Retina */}
      <mesh onClick={() => onSelect("retina")} castShadow>
        <sphereGeometry args={[2.0, 32, 32, 0, Math.PI * 2, 1.2, Math.PI * 0.9]} />
        <meshStandardMaterial color={getColor("retina","#b03030")} roughness={0.6} side={THREE.BackSide} />
      </mesh>
      {/* Optic nerve */}
      <mesh position={[0, 0, -2.2]} onClick={() => onSelect("optic_nerve")} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 1.2, 16]} />
        <meshStandardMaterial color={getColor("optic_nerve","#f4c430")} roughness={0.5} />
      </mesh>
      {/* Macula highlight */}
      <mesh position={[0.3, 0, -1.95]}>
        <circleGeometry args={[0.18, 20]} />
        <meshStandardMaterial color="#ff8c00" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function EarModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.25; });
  const getColor = (partId: string, d: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return d;
    return ORGAN_SYSTEMS[2].parts.find(p => p.id === partId)?.conditions.find(c => c.id === cond)?.color || d;
  };

  // Cochlea spiral points
  const cochleaPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let t = 0; t <= Math.PI * 4; t += 0.15) {
      const r = 0.2 + t * 0.13;
      pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, t * 0.12));
    }
    return pts;
  }, []);
  const cochleaCurve = useMemo(() => new THREE.CatmullRomCurve3(cochleaPoints), [cochleaPoints]);

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Ear canal */}
      <mesh position={[0, 0, 0]} onClick={() => onSelect("eardrum")} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 3, 24]} />
        <meshStandardMaterial color="#d4a878" roughness={0.7} side={THREE.BackSide} />
      </mesh>
      {/* Outer ear canal wall */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 3, 24]} />
        <meshStandardMaterial color="#e8c090" roughness={0.6} />
      </mesh>
      {/* Eardrum */}
      <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={() => onSelect("eardrum")} castShadow>
        <circleGeometry args={[0.52, 40]} />
        <meshStandardMaterial color={getColor("eardrum","#f0c4a0")} roughness={0.4} side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      {/* Malleus handle */}
      <mesh position={[0, -1.8, 0]} onClick={() => onSelect("ossicles")} castShadow>
        <cylinderGeometry args={[0.06, 0.04, 0.9, 10]} />
        <meshStandardMaterial color={getColor("ossicles","#e0c090")} roughness={0.4} />
      </mesh>
      <mesh position={[0, -1.4, 0]} onClick={() => onSelect("ossicles")} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={getColor("ossicles","#e0c090")} roughness={0.4} />
      </mesh>
      {/* Incus */}
      <mesh position={[0.25, -1.45, 0]} onClick={() => onSelect("ossicles")} castShadow>
        <boxGeometry args={[0.28, 0.12, 0.12]} />
        <meshStandardMaterial color={getColor("ossicles","#ddc080")} roughness={0.4} />
      </mesh>
      {/* Stapes stirrup */}
      <mesh position={[0.5, -1.45, 0]} onClick={() => onSelect("ossicles")} castShadow>
        <torusGeometry args={[0.1, 0.03, 8, 20, Math.PI]} />
        <meshStandardMaterial color={getColor("ossicles","#d8b870")} roughness={0.4} />
      </mesh>
      {/* Cochlea tube spiral */}
      <mesh position={[0.9, -1.6, 0]} onClick={() => onSelect("cochlea")} castShadow>
        <tubeGeometry args={[cochleaCurve, 80, 0.08, 8, false]} />
        <meshStandardMaterial color={getColor("cochlea","#6ec898")} roughness={0.3} />
      </mesh>
      {/* Semi-circular canals */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0.9, -1.6, 0]} rotation={[i * Math.PI / 3, i * Math.PI / 4, 0]}>
          <torusGeometry args={[0.55, 0.05, 8, 30, Math.PI * 1.5]} />
          <meshStandardMaterial color="#90d4b0" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function HeartModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      const beat = Math.sin(state.clock.elapsedTime * 3.5);
      const scale = 1 + beat * 0.04;
      group.current.scale.set(scale, scale, scale);
      group.current.rotation.y += 0.004;
    }
  });
  const getColor = (partId: string, d: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return d;
    return ORGAN_SYSTEMS[3].parts.find(p => p.id === partId)?.conditions.find(c => c.id === cond)?.color || d;
  };
  return (
    <group ref={group}>
      {/* Left ventricle - main chamber */}
      <mesh position={[-0.6, -0.3, 0]} onClick={() => onSelect("left_ventricle")} castShadow>
        <sphereGeometry args={[1.4, 24, 24]} />
        <meshStandardMaterial color={getColor("left_ventricle","#c0392b")} roughness={0.5} />
      </mesh>
      {/* Right ventricle */}
      <mesh position={[0.8, -0.1, 0.3]} onClick={() => onSelect("right_ventricle")} castShadow>
        <sphereGeometry args={[1.1, 24, 24]} />
        <meshStandardMaterial color={getColor("right_ventricle","#e08080")} roughness={0.5} />
      </mesh>
      {/* Left atrium */}
      <mesh position={[-0.7, 1.1, -0.3]}>
        <sphereGeometry args={[0.8, 20, 20]} />
        <meshStandardMaterial color="#c84040" roughness={0.5} />
      </mesh>
      {/* Right atrium */}
      <mesh position={[0.7, 1.0, 0]}>
        <sphereGeometry args={[0.75, 20, 20]} />
        <meshStandardMaterial color="#e09090" roughness={0.5} />
      </mesh>
      {/* Aorta */}
      <mesh position={[-0.3, 2.1, 0]} onClick={() => onSelect("coronary")} castShadow>
        <cylinderGeometry args={[0.28, 0.35, 1.8, 16]} />
        <meshStandardMaterial color={getColor("coronary","#f0a020")} roughness={0.3} />
      </mesh>
      {/* Aortic arch */}
      <mesh position={[0.4, 2.8, 0]}>
        <torusGeometry args={[0.55, 0.27, 12, 20, Math.PI * 0.8]} />
        <meshStandardMaterial color={getColor("coronary","#e89010")} roughness={0.3} />
      </mesh>
      {/* Pulmonary artery */}
      <mesh position={[0.5, 2.0, 0.2]}>
        <cylinderGeometry args={[0.22, 0.28, 1.4, 14]} />
        <meshStandardMaterial color="#7090d0" roughness={0.3} />
      </mesh>
      {/* Vena Cava */}
      <mesh position={[1.1, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 2.4, 12]} />
        <meshStandardMaterial color="#4060b0" roughness={0.4} />
      </mesh>
      {/* Valves */}
      {[[-0.4, 0.3, 0], [0.4, 0.3, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z as number]} rotation={[Math.PI / 2, 0, 0]} onClick={() => onSelect("valves")} castShadow>
          <torusGeometry args={[0.25, 0.06, 8, 20]} />
          <meshStandardMaterial color={getColor("valves","#f0a0a0")} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function SpineModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.2; });
  const getColor = (partId: string, d: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return d;
    return ORGAN_SYSTEMS[4].parts.find(p => p.id === partId)?.conditions.find(c => c.id === cond)?.color || d;
  };
  const vertebraeY = [-3.2, -1.8, -0.4, 1.0, 2.4];
  return (
    <group ref={group}>
      {vertebraeY.map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          {/* Vertebral body */}
          <mesh onClick={() => onSelect("vertebra")} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 0.9, 20]} />
            <meshStandardMaterial color={getColor("vertebra","#e0d4c0")} roughness={0.5} />
          </mesh>
          {/* Spinous process (back) */}
          <mesh position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} onClick={() => onSelect("vertebra")} castShadow>
            <coneGeometry args={[0.12, 0.9, 8]} />
            <meshStandardMaterial color={getColor("vertebra","#d8c8b0")} roughness={0.5} />
          </mesh>
          {/* Transverse processes */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, 0, side * 0.85]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
              <meshStandardMaterial color="#d0c0a8" roughness={0.5} />
            </mesh>
          ))}
          {/* Spinal cord channel */}
          <mesh position={[0.45, 0, 0]} onClick={() => onSelect("nerve")} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.95, 14]} />
            <meshStandardMaterial color="#e8e0a0" roughness={0.4} />
          </mesh>
          <mesh position={[0.45, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.95, 10]} />
            <meshStandardMaterial color={getColor("nerve","#f5d76e")} roughness={0.4} />
          </mesh>
          {/* Disc between vertebrae */}
          {i < vertebraeY.length - 1 && (
            <mesh position={[0, 0.75, 0]} onClick={() => onSelect("disc")} castShadow>
              <cylinderGeometry args={[0.62, 0.62, 0.45, 20]} />
              <meshStandardMaterial color={getColor("disc","#7bafd0")} roughness={0.6} transparent opacity={0.9} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function KneeModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.22; });
  const getColor = (partId: string, d: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return d;
    return ORGAN_SYSTEMS[5].parts.find(p => p.id === partId)?.conditions.find(c => c.id === cond)?.color || d;
  };
  return (
    <group ref={group}>
      {/* Femur shaft */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 2.8, 20]} />
        <meshStandardMaterial color="#ede0d0" roughness={0.4} />
      </mesh>
      {/* Femoral condyles */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.7, 0]} onClick={() => onSelect("cartilage")} castShadow>
          <sphereGeometry args={[0.72, 20, 20]} />
          <meshStandardMaterial color="#ede0d0" roughness={0.35} />
        </mesh>
      ))}
      {/* Cartilage on femoral condyles */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.25, 0]} onClick={() => onSelect("cartilage")} castShadow>
          <sphereGeometry args={[0.75, 20, 20, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.28]} />
          <meshStandardMaterial color={getColor("cartilage","#a8e6cf")} roughness={0.5} transparent opacity={0.9} />
        </mesh>
      ))}
      {/* Meniscus medial & lateral */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={() => onSelect("meniscus")} castShadow>
          <torusGeometry args={[0.42, 0.14, 8, 24, Math.PI * 1.5]} />
          <meshStandardMaterial color={getColor("meniscus","#c4f0c4")} roughness={0.6} />
        </mesh>
      ))}
      {/* Tibia */}
      <mesh position={[0, -1.8, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.44, 2.6, 20]} />
        <meshStandardMaterial color="#ede0d0" roughness={0.4} />
      </mesh>
      {/* Tibial plateau */}
      <mesh position={[0, -0.3, 0]} onClick={() => onSelect("cartilage")} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.2, 24]} />
        <meshStandardMaterial color={getColor("cartilage","#a8e6cf")} roughness={0.5} />
      </mesh>
      {/* Patella */}
      <mesh position={[0, 0.5, 0.88]} onClick={() => onSelect("cartilage")} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#ece0d0" roughness={0.4} />
      </mesh>
      {/* ACL */}
      <mesh position={[0.15, 0.3, 0.1]} rotation={[0.4, 0.2, 0.3]} onClick={() => onSelect("ligament")} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.4, 8]} />
        <meshStandardMaterial color={getColor("ligament","#f8c878")} roughness={0.6} transparent opacity={0.85} />
      </mesh>
      {/* PCL */}
      <mesh position={[-0.15, 0.3, -0.1]} rotation={[-0.4, 0.2, -0.3]} onClick={() => onSelect("ligament")} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.4, 8]} />
        <meshStandardMaterial color={getColor("ligament","#e8b860")} roughness={0.6} transparent opacity={0.85} />
      </mesh>
      {/* Collateral ligaments */}
      {[-1.0, 1.0].map((x, i) => (
        <mesh key={i} position={[x * 0.9, 0.3, 0]} rotation={[0, 0, x * 0.15]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 1.6, 8]} />
          <meshStandardMaterial color={getColor("ligament","#f0d090")} roughness={0.6} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BrainModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.18; });
  const getColor = (partId: string, d: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return d;
    return ORGAN_SYSTEMS[6].parts.find(p => p.id === partId)?.conditions.find(c => c.id === cond)?.color || d;
  };
  return (
    <group ref={group}>
      {/* Left hemisphere */}
      <mesh position={[-0.6, 0, 0]} onClick={() => onSelect("cerebrum")} castShadow>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshStandardMaterial color={getColor("cerebrum","#e8a090")} roughness={0.8} />
      </mesh>
      {/* Right hemisphere */}
      <mesh position={[0.6, 0, 0]} onClick={() => onSelect("cerebrum")} castShadow>
        <sphereGeometry args={[1.75, 32, 32]} />
        <meshStandardMaterial color={getColor("cerebrum","#e89888")} roughness={0.8} />
      </mesh>
      {/* Medial fissure divider */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.08, 2.8, 2.6]} />
        <meshStandardMaterial color="#c07060" roughness={1} />
      </mesh>
      {/* Gyri/sulci bumps on surface */}
      {Array.from({ length: 18 }, (_, i) => {
        const theta = (i / 18) * Math.PI * 2;
        const r = 1.6;
        const side = i % 2 === 0 ? -0.55 : 0.55;
        return (
          <mesh key={i} position={[side + Math.cos(theta) * 0.4, Math.sin(theta) * 0.9, Math.cos(theta * 1.3) * 1.1]} onClick={() => onSelect("cerebrum")}>
            <sphereGeometry args={[0.28, 10, 10]} />
            <meshStandardMaterial color={getColor("cerebrum","#d88878")} roughness={0.9} />
          </mesh>
        );
      })}
      {/* Cerebellum */}
      <mesh position={[0, -1.4, -1.3]} onClick={() => onSelect("cerebellum")} castShadow>
        <sphereGeometry args={[1.0, 24, 24]} />
        <meshStandardMaterial color={getColor("cerebellum","#f0b080")} roughness={0.7} />
      </mesh>
      {/* Cerebellum folds */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[(-0.5 + i * 0.2), -1.5, -1.3]} onClick={() => onSelect("cerebellum")}>
          <boxGeometry args={[0.06, 0.8, 1.2]} />
          <meshStandardMaterial color={getColor("cerebellum","#d89060")} roughness={0.8} />
        </mesh>
      ))}
      {/* Brain stem */}
      <mesh position={[0, -2.2, -0.5]} rotation={[0.4, 0, 0]} onClick={() => onSelect("cerebellum")} castShadow>
        <cylinderGeometry args={[0.38, 0.3, 1.4, 16]} />
        <meshStandardMaterial color="#c08878" roughness={0.6} />
      </mesh>
      {/* Ventricles */}
      <mesh position={[0, 0, 0]} onClick={() => onSelect("ventricles")} castShadow>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshPhysicalMaterial color={getColor("ventricles","#a0c8e0")} roughness={0.1} transparent opacity={0.5} transmission={0.6} />
      </mesh>
      {/* Corpus callosum */}
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.7, 0.12, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#d0b0a0" roughness={0.5} />
      </mesh>
    </group>
  );
}

function LungModel({ selectedPart, conditionMap, onSelect }: any) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      const breath = Math.sin(state.clock.elapsedTime * 1.5);
      group.current.scale.set(1 + breath * 0.03, 1 + breath * 0.05, 1 + breath * 0.03);
      group.current.rotation.y += 0.003;
    }
  });
  const getColor = (partId: string, d: string) => {
    const cond = conditionMap[partId];
    if (!cond || cond === "healthy") return d;
    return ORGAN_SYSTEMS[7].parts.find(p => p.id === partId)?.conditions.find(c => c.id === cond)?.color || d;
  };
  // Lung lobes
  const rightLobes = [[0.7, 1.2, 0, 1.0], [0.9, -0.2, 0, 1.1], [0.7, -1.5, 0, 0.9]];
  const leftLobes = [[-0.7, 0.9, 0, 0.95], [-0.8, -0.6, 0, 1.0]];
  return (
    <group ref={group}>
      {/* Trachea */}
      <mesh position={[0, 3.2, 0]} onClick={() => onSelect("bronchi")} castShadow>
        <cylinderGeometry args={[0.28, 0.3, 2.4, 16]} />
        <meshStandardMaterial color={getColor("bronchi","#88c4e0")} roughness={0.3} />
      </mesh>
      {/* Tracheal rings */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 4.0 - i * 0.4, 0]}>
          <torusGeometry args={[0.3, 0.05, 6, 16, Math.PI * 1.6]} />
          <meshStandardMaterial color="#70b0d0" roughness={0.4} />
        </mesh>
      ))}
      {/* Main bronchi */}
      {[[-0.6, 2.0, 0, -0.35], [0.6, 2.0, 0, 0.35]].map(([x, y, z, rz], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} rotation={[0, 0, rz as number]} onClick={() => onSelect("bronchi")} castShadow>
          <cylinderGeometry args={[0.18, 0.2, 1.0, 12]} />
          <meshStandardMaterial color={getColor("bronchi","#80bcd8")} roughness={0.35} />
        </mesh>
      ))}
      {/* Right lung lobes */}
      {rightLobes.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} onClick={() => onSelect("alveoli")} castShadow>
          <sphereGeometry args={[r as number, 20, 20]} />
          <meshStandardMaterial color={getColor("alveoli","#b8e8b8")} roughness={0.6} transparent opacity={0.9} />
        </mesh>
      ))}
      {/* Left lung lobes */}
      {leftLobes.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} onClick={() => onSelect("alveoli")} castShadow>
          <sphereGeometry args={[r as number, 20, 20]} />
          <meshStandardMaterial color={getColor("alveoli","#aadfaa")} roughness={0.6} transparent opacity={0.9} />
        </mesh>
      ))}
      {/* Pleura */}
      <mesh position={[0.8, 0, 0]} onClick={() => onSelect("pleura")} castShadow>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshStandardMaterial color={getColor("pleura","#d0f0d0")} roughness={0.3} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-0.8, 0, 0]} onClick={() => onSelect("pleura")} castShadow>
        <sphereGeometry args={[1.6, 16, 16]} />
        <meshStandardMaterial color={getColor("pleura","#d0f0d0")} roughness={0.3} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      {/* Bronchioles */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI;
        const side = i < 4 ? 0.8 : -0.7;
        return (
          <mesh key={i} position={[side + Math.cos(angle) * 0.5, Math.sin(angle) * 0.7, 0]}
            rotation={[0, 0, angle + (i < 4 ? 0.5 : -0.5)]} onClick={() => onSelect("bronchi")}>
            <cylinderGeometry args={[0.05, 0.07, 0.6, 6]} />
            <meshStandardMaterial color={getColor("bronchi","#70aac8")} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

const MODEL_MAP: Record<string, React.FC<any>> = {
  tooth: ToothModel, eye: EyeModel, ear: EarModel,
  heart: HeartModel, spine: SpineModel, knee: KneeModel,
  brain: BrainModel, lung: LungModel,
};

/* ─── Scene ──────────────────────────────────────────────────────────────── */
function Scene({ organId, selectedPart, conditionMap, onSelect, cameraPos }: {
  organId: string; selectedPart: string | null;
  conditionMap: Record<string, string>; onSelect: (p: string) => void;
  cameraPos: [number, number, number];
}) {
  const Model = MODEL_MAP[organId];
  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPos} fov={42} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} />
      <pointLight position={[0, 0, 6]} intensity={0.6} color="#e0f4ff" />
      <pointLight position={[0, -4, -2]} intensity={0.3} color="#ffd0a0" />
      <Suspense fallback={null}>
        {Model && <Model selectedPart={selectedPart} conditionMap={conditionMap} onSelect={onSelect} />}
      </Suspense>
      <OrbitControls enablePan={false} minDistance={3} maxDistance={16} makeDefault />
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
const SEVERITY_BADGE: Record<string, string> = {
  healthy: "bg-green-100 text-green-800 border-green-200",
  mild: "bg-yellow-100 text-yellow-800 border-yellow-200",
  moderate: "bg-orange-100 text-orange-800 border-orange-200",
  severe: "bg-red-100 text-red-800 border-red-200",
};

export default function Medical3DPage() {
  const [organId, setOrganId] = useState("tooth");
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [conditionMap, setConditionMap] = useState<Record<string, string>>({});
  const [beforeAfter, setBeforeAfter] = useState<"current"|"healthy">("current");

  const organ = ORGAN_SYSTEMS.find(o => o.id === organId)!;

  const handleSelectPart = (partId: string) => {
    setSelectedPart(partId);
    // Default to first condition on first click
    if (!conditionMap[partId]) {
      const part = organ.parts.find(p => p.id === partId);
      if (part?.conditions[0]) {
        setConditionMap(m => ({ ...m, [partId]: part.conditions[0].id }));
      }
    }
  };

  const handleCondition = (partId: string, condId: string) => {
    setConditionMap(m => ({ ...m, [partId]: condId }));
  };

  const handleOrganChange = (id: string) => {
    setOrganId(id);
    setSelectedPart(null);
    setConditionMap({});
  };

  const activePart = organ.parts.find(p => p.id === selectedPart);
  const activeConditionId = selectedPart ? (conditionMap[selectedPart] || "healthy") : null;
  const activeCondition = activePart?.conditions.find(c => c.id === activeConditionId);
  const effectiveConditionMap = beforeAfter === "healthy" ? {} : conditionMap;

  const hasAnyCondition = Object.values(conditionMap).some(v => v && v !== "healthy");

  return (
    <Layout>
      <div className="container mx-auto px-3 py-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Medical 3D Atlas</h1>
          <p className="text-muted-foreground text-sm mt-1">Interactive 3D anatomy — click any part to diagnose, explore conditions and get treatment guidance</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr_300px] gap-4">

          {/* ── LEFT: Organ Selector ── */}
          <div className="flex xl:flex-col gap-2 overflow-x-auto xl:overflow-x-visible pb-2 xl:pb-0">
            <p className="hidden xl:block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Body Systems</p>
            {ORGAN_SYSTEMS.map(o => (
              <button
                key={o.id}
                onClick={() => handleOrganChange(o.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                  o.id === organId
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card border-border hover:border-primary hover:bg-primary/5"
                )}
              >
                <span className="text-lg">{o.icon}</span>
                <span>{o.name}</span>
              </button>
            ))}
          </div>

          {/* ── CENTER: 3D Canvas ── */}
          <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 rounded-2xl overflow-hidden" style={{ minHeight: 500 }}>
            {/* Before/After */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm rounded-full p-1 flex gap-1">
              {(["current","healthy"] as const).map(v => (
                <button key={v} onClick={() => setBeforeAfter(v)}
                  className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize",
                    beforeAfter === v ? "bg-white text-black shadow" : "text-white/60 hover:text-white")}>
                  {v === "current" ? "Current State" : "Healthy View"}
                </button>
              ))}
            </div>

            {/* Organ name tag */}
            <div className="absolute top-3 left-3 z-10">
              <span className="text-lg">{organ.icon}</span>
              <span className="ml-1.5 text-white/70 text-xs font-medium">{organ.name}</span>
            </div>

            {/* Hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-white/40 text-[11px] pointer-events-none whitespace-nowrap">
              Drag to rotate · Scroll to zoom · Click a part to inspect
            </div>

            {checkWebGL() ? (
              <Canvas shadows style={{ height: 500 }}>
                <Scene
                  key={organId}
                  organId={organId}
                  selectedPart={selectedPart}
                  conditionMap={effectiveConditionMap}
                  onSelect={handleSelectPart}
                  cameraPos={organ.cameraPos}
                />
              </Canvas>
            ) : (
              <WebGLFallback organName={organ.name} organIcon={organ.icon} category={organ.category} />
            )}
          </div>

          {/* ── RIGHT: Info Panel ── */}
          <div className="flex flex-col gap-3">
            {/* Part selector */}
            <div className="bg-card border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Anatomy Parts</p>
              <div className="grid grid-cols-2 xl:grid-cols-1 gap-1.5">
                {organ.parts.map(part => {
                  const condId = conditionMap[part.id] || "healthy";
                  const cond = part.conditions.find(c => c.id === condId) || part.conditions[0];
                  return (
                    <button
                      key={part.id}
                      onClick={() => handleSelectPart(part.id)}
                      className={cn(
                        "flex items-center gap-2 text-left px-2.5 py-2 rounded-lg border text-xs transition-all",
                        selectedPart === part.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 bg-muted/30"
                      )}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cond?.color }} />
                      <span className="font-medium truncate">{part.label}</span>
                      {condId !== "healthy" && <span className="ml-auto text-[9px] text-red-500">●</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Condition for selected part */}
            {activePart && (
              <div className="bg-card border rounded-xl p-3 animate-slide-up">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{activePart.label} — Condition</p>
                <div className="flex flex-col gap-1.5 mb-3">
                  {activePart.conditions.map(cond => (
                    <button
                      key={cond.id}
                      onClick={() => handleCondition(activePart.id, cond.id)}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-all text-left",
                        conditionMap[activePart.id] === cond.id
                          ? "border-primary bg-primary/5 font-semibold"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cond.color }} />
                      <span>{cond.label}</span>
                      <Badge variant="outline" className={cn("ml-auto text-[9px] px-1 py-0", SEVERITY_BADGE[cond.severity])}>
                        {cond.severity}
                      </Badge>
                    </button>
                  ))}
                </div>
                {activeCondition && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">{activeCondition.description}</p>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 mb-3">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">Recommendation</p>
                      <p className="text-xs">{activeCondition.recommendation}</p>
                    </div>
                    {activeCondition.severity !== "healthy" && (
                      <Link href={`/clinics?category=${organ.category}`}>
                        <Button size="sm" className="w-full text-xs">
                          Book {organ.name} Specialist
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}

            {/* CTA */}
            {!activePart && (
              <div className="bg-gradient-to-br from-primary/10 to-teal-100 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-2xl mb-2">{organ.icon}</p>
                <p className="font-semibold text-sm mb-1">Click any part</p>
                <p className="text-xs text-muted-foreground mb-3">{organ.description}</p>
                <Link href={`/clinics?category=${organ.category}`}>
                  <Button size="sm" variant="outline" className="w-full text-xs">Find {organ.name} Specialists</Button>
                </Link>
              </div>
            )}

            {/* Reset */}
            {hasAnyCondition && (
              <Button variant="outline" size="sm" onClick={() => { setConditionMap({}); setSelectedPart(null); }} className="text-xs">
                Reset to Healthy
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
