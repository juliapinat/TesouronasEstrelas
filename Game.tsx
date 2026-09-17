import { useCallback, useEffect, useRef, useState } from "react";
import { buildWorld, step, LEVEL_COUNT, type Input, type World } from "@/game/engine";
import { LEVELS } from "@/game/levels";
import { draw } from "@/game/render";

type Phase = "intro" | "playing" | "dead" | "levelCleared" | "won";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const inputRef = useRef<Input>({ left: false, right: false, jump: false });
  const phaseRef = useRef<Phase>("intro");
  const rafRef = useRef<number | null>(null);

  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [gems, setGems] = useState(0);
  const [deaths, setDeaths] = useState(0);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const startLevel = useCallback(
    (index: number) => {
      worldRef.current = buildWorld(index);
      setLevelIndex(index);
      setPhaseBoth("playing");
    },
    [setPhaseBoth],
  );

  // teclado
  useEffect(() => {
    const keyMap = (code: string) => {
      if (code === "ArrowLeft" || code === "KeyA") return "left" as const;
      if (code === "ArrowRight" || code === "KeyD") return "right" as const;
      if (code === "Space" || code === "ArrowUp" || code === "KeyW") return "jump" as const;
      return null;
    };
    const down = (e: KeyboardEvent) => {
      const k = keyMap(e.code);
      if (k) {
        e.preventDefault();
        inputRef.current[k] = true;
      }
      if (e.code === "Enter" || e.code === "Space") {
        const p = phaseRef.current;
        if (p === "dead") startLevel(levelIndexRef.current);
        else if (p === "levelCleared") startLevel(levelIndexRef.current + 1);
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = keyMap(e.code);
      if (k) inputRef.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [startLevel]);

  const levelIndexRef = useRef(0);
  useEffect(() => {
    levelIndexRef.current = levelIndex;
  }, [levelIndex]);

  // loop principal
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    let deadAt = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const frame = (now: number) => {
      rafRef.current = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const w = worldRef.current;
      const rect = canvas.getBoundingClientRect();
      if (!w) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        return;
      }

      if (phaseRef.current === "playing") {
        const r = step(w, inputRef.current, dt);
        if (r.coinsGot) setGems((g) => g + r.coinsGot);
        if (r.died) {
          deadAt = now;
          setDeaths((d) => d + 1);
          setPhaseBoth("dead");
        } else if (r.cleared) {
          if (levelIndexRef.current + 1 >= LEVEL_COUNT) setPhaseBoth("won");
          else setPhaseBoth("levelCleared");
        }
      } else if (phaseRef.current === "dead") {
        w.timer += dt;
        // volta ao início da fase automaticamente
        if (now - deadAt > 1100) startLevel(levelIndexRef.current);
      } else {
        w.timer += dt;
      }

      draw(ctx, w, rect.width, rect.height);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [setPhaseBoth, startLevel]);

  const hold = (key: keyof Input, value: boolean) => () => {
    inputRef.current[key] = value;
  };

  const level = LEVELS[Math.min(levelIndex, LEVELS.length - 1)]!;

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border-4 border-primary/60 bg-card shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-4 py-2 text-primary-foreground">
        <span className="font-bold tracking-wide">{level.name}</span>
        <span className="text-sm">
          Gemas: {gems} · Quedas: {deaths} · Fase {Math.min(levelIndex + 1, LEVEL_COUNT)}/
          {LEVEL_COUNT}
        </span>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} className="block h-[60vh] max-h-[520px] min-h-[320px] w-full" />

        {phase === "intro" && (
          <Overlay>
            <h2 className="text-3xl font-black">Nina e o Tesouro Perdido</h2>
            <p className="max-w-md text-sm opacity-90">
              Atravesse 5 fases cheias de fungos, morcegos, espinhos e lava para recuperar o tesouro
              da família. Pule na cabeça dos fungos para derrotá-los. Se cair ou for atingido, você
              volta para o início da fase.
            </p>
            <p className="text-sm opacity-80">Setas ou A/D para andar · Espaço para pular</p>
            <Button onClick={() => startLevel(0)}>Começar aventura</Button>
          </Overlay>
        )}

        {phase === "dead" && (
          <Overlay>
            <h2 className="text-3xl font-black">Ai! Você caiu</h2>
            <p className="text-sm opacity-90">Voltando para o início da fase...</p>
          </Overlay>
        )}

        {phase === "levelCleared" && (
          <Overlay>
            <h2 className="text-3xl font-black">Fase concluída!</h2>
            <p className="text-sm opacity-90">{LEVELS[levelIndex + 1]?.hint}</p>
            <Button onClick={() => startLevel(levelIndex + 1)}>Próxima fase</Button>
          </Overlay>
        )}

        {phase === "won" && (
          <Overlay>
            <h2 className="text-3xl font-black">Tesouro recuperado!</h2>
            <p className="max-w-md text-sm opacity-90">
              Você atravessou as 5 fases e trouxe o tesouro de volta com {gems} gemas e {deaths}{" "}
              quedas.
            </p>
            <Button
              onClick={() => {
                setGems(0);
                setDeaths(0);
                startLevel(0);
              }}
            >
              Jogar de novo
            </Button>
          </Overlay>
        )}
      </div>

      {/* Controles para toque */}
      <div className="flex items-center justify-between gap-3 bg-secondary px-4 py-3 md:hidden">
        <div className="flex gap-3">
          <TouchBtn onDown={hold("left", true)} onUp={hold("left", false)} label="◀" />
          <TouchBtn onDown={hold("right", true)} onUp={hold("right", false)} label="▶" />
        </div>
        <TouchBtn onDown={hold("jump", true)} onUp={hold("jump", false)} label="PULAR" wide />
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-foreground/70 px-6 text-center text-background backdrop-blur-sm">
      {children}
    </div>
  );
}

function Button({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-accent px-6 py-3 text-base font-bold text-accent-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      {children}
    </button>
  );
}

function TouchBtn({
  label,
  onDown,
  onUp,
  wide,
}: {
  label: string;
  onDown: () => void;
  onUp: () => void;
  wide?: boolean;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onDown();
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      className={`select-none rounded-xl bg-primary py-3 font-bold text-primary-foreground active:opacity-80 ${
        wide ? "px-8" : "px-6"
      }`}
    >
      {label}
    </button>
  );
}
