import { useCallback, useMemo } from "react";
import { Particles, ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useReducedMotion } from "framer-motion";

const PARTICLE_COLORS = ["#60a5fa", "#93c5fd", "#818cf8", "#34d399"];

export function createParticlesOptions(shouldReduceMotion = false) {
  return {
    autoPlay: !shouldReduceMotion,
    fullScreen: {
      enable: false
    },
    fpsLimit: 60,
    detectRetina: true,
    resize: {
      enable: true
    },
    background: {
      color: {
        value: "transparent"
      }
    },
    interactivity: {
      detectsOn: "window",
      events: {
        onHover: {
          enable: !shouldReduceMotion,
          mode: ["grab", "attract"]
        },
        onClick: {
          enable: !shouldReduceMotion,
          mode: "push"
        }
      },
      modes: {
        grab: {
          distance: 170,
          links: {
            opacity: 0.36,
            color: "#60a5fa"
          }
        },
        attract: {
          distance: 210,
          duration: 0.4,
          factor: 1.5,
          speed: 1.4,
          maxSpeed: 12
        },
        push: {
          quantity: 2
        }
      }
    },
    particles: {
      number: {
        value: 48,
        density: {
          enable: true,
          width: 1440,
          height: 900
        }
      },
      paint: {
        color: {
          value: PARTICLE_COLORS
        },
        fill: {
          enable: true,
          opacity: 1
        }
      },
      shape: {
        type: "circle"
      },
      opacity: {
        value: { min: 0.25, max: 0.65 }
      },
      size: {
        value: { min: 1.4, max: 3.4 }
      },
      links: {
        enable: true,
        color: "#60a5fa",
        distance: 145,
        opacity: 0.16,
        width: 1
      },
      move: {
        enable: !shouldReduceMotion,
        speed: 0.85,
        direction: "none",
        random: true,
        straight: false,
        outModes: {
          default: "out"
        }
      }
    }
  };
}

export function Background() {
  const shouldReduceMotion = useReducedMotion();

  const initParticles = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const options = useMemo(
    () => createParticlesOptions(Boolean(shouldReduceMotion)),
    [shouldReduceMotion]
  );

  return (
    <div className="bg-stage" aria-hidden="true">
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />

      {!shouldReduceMotion && (
        <ParticlesProvider init={initParticles}>
          <Particles id="tsparticles" className="particles-canvas-layer" options={options} />
        </ParticlesProvider>
      )}
    </div>
  );
}

export default Background;
