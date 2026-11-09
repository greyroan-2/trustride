"use client";
import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { interiorReferences } from "@/lib/interior-images";
import { InteriorGallery } from "@/components/interior-gallery";
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}
function Demo() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[3, 48, 32]} />
        <meshStandardMaterial color="#34465e" wireframe side={2} />
      </mesh>

    </group>
  );
}
export function Viewer({ url, panorama, modelSlug }: { url?: string; panorama?: string; modelSlug?: string }) {
  const reference = modelSlug ? interiorReferences[modelSlug] : undefined;
  if (!url && !panorama && reference) return <InteriorGallery key={modelSlug} reference={reference} />;
  return <ThreeViewer url={url} panorama={panorama} />;
}
function ThreeViewer({ url, panorama }: { url?: string; panorama?: string }) {
  const controls = useRef<OrbitControlsType>(null);
  const { active: loading } = useProgress();
  return (
    <>
      <div className="viewer">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={1.5} />
          <Suspense fallback={null}>
            {url ? (
              <>
                <Model url={url} />
                <Environment preset="studio" />
              </>
            ) : panorama ? (
              <Panorama url={panorama} />
            ) : (
              <Demo />
            )}
          </Suspense>
          <OrbitControls
            ref={controls}
            enablePan={false}
            minDistance={0.1}
            maxDistance={12}
          />
        </Canvas>
        {loading && <div className="viewer-overlay" role="status">Loading interior?</div>}
        {!url && !panorama && (
          <div className="viewer-overlay">
            <div className="panel" style={{ width: 200, textAlign: "center" }}>
              <strong>Interior demonstration</strong>
              <p style={{ fontSize: 11 }}>Drag to rotate. This abstract viewing space is not a Toyota interior replica.</p>
            </div>
          </div>
        )}
        <div className="viewer-controls">
          <button
            aria-label="Zoom in"
            onClick={() => {
              controls.current?.dollyIn(1.2);
              controls.current?.update();
            }}
          >
            <ZoomIn size={17} />
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => {
              controls.current?.dollyOut(1.2);
              controls.current?.update();
            }}
          >
            <ZoomOut size={17} />
          </button>
          <button aria-label="Reset view" onClick={() => controls.current?.reset()}>
            <RotateCcw size={17} />
          </button>
        </div>
      </div>
      <p className="discreet">
        {url || panorama
          ? "Interactive interior asset supplied by the business."
          : "Demonstration viewer · Verified Toyota interior assets have not yet been supplied."}{" "}
        Drag to look around; pinch or scroll to zoom.
      </p>
    </>
  );
}
import { useTexture } from "@react-three/drei";
function Panorama({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh>
      <sphereGeometry args={[10, 64, 32]} />
      <meshBasicMaterial map={texture} side={2} />
    </mesh>
  );
}
