export interface DemoExample {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  description: string;
  code: string;
  language: string;
}

export const HOMEPAGE_DEMOS: DemoExample[] = [
  {
    id: "weather-station",
    title: "Atmospheric Weather & Telemetry Station",
    badge: "Sensors & Weather",
    prompt: "Build an atmospheric station dashboard with multi-city weather tabs, dynamic temperatures, and humidity gauges.",
    description: "Here is the atmospheric station component with automatic city transitions, simulated sensor telemetry, and unit conversions:",
    language: "jsx",
    code: `export default function WeatherStation() {
  const [city, setCity] = useState("Tokyo");
  const [unit, setUnit] = useState("C");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  const data = {
    Tokyo: { tempC: 22, condition: "Partly Cloudy", icon: "⛅", humidity: 62, wind: "14 km/h", aqi: "38 (Good)" },
    "San Francisco": { tempC: 17, condition: "Coastal Fog", icon: "🌫️", humidity: 78, wind: "19 km/h", aqi: "24 (Good)" },
    Bengaluru: { tempC: 27, condition: "Clear Sky", icon: "☀️", humidity: 45, wind: "8 km/h", aqi: "54 (Moderate)" },
    London: { tempC: 14, condition: "Light Rain", icon: "🌧️", humidity: 85, wind: "22 km/h", aqi: "18 (Good)" },
  };

  const cities = ["Tokyo", "San Francisco", "Bengaluru", "London"];

  // Autonomous Demonstration State Machine
  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isAutoPlaying || isUserInteracted || prefersReducedMotion) return;

    let timer = null;
    const scheduleNext = () => {
      timer = setTimeout(() => {
        if (document.hidden) {
          scheduleNext();
          return;
        }
        setCity((prevCity) => {
          const idx = cities.indexOf(prevCity);
          const nextIdx = (idx + 1) % cities.length;
          // Toggle unit occasionally at the end of a full loop
          if (nextIdx === 0) {
            setUnit((u) => (u === "C" ? "F" : "C"));
          }
          return cities[nextIdx];
        });
        scheduleNext();
      }, 3400);
    };

    scheduleNext();

    const handleVisibility = () => {
      if (document.hidden && timer) clearTimeout(timer);
      else if (!document.hidden) scheduleNext();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAutoPlaying, isUserInteracted]);

  const handleManualCity = (c) => {
    setCity(c);
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
  };

  const handleManualUnit = () => {
    setUnit(unit === "C" ? "F" : "C");
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
  };

  const handleResetDemo = () => {
    setCity("Tokyo");
    setUnit("C");
    setIsUserInteracted(false);
    setIsAutoPlaying(true);
  };

  const current = data[city] || data.Tokyo;
  const temp = unit === "C" ? current.tempC : Math.round((current.tempC * 9) / 5 + 32);

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 text-white max-w-md mx-auto shadow-2xl space-y-4 font-sans">
      {/* Auto-Demo Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className={"w-2 h-2 rounded-full " + (isAutoPlaying && !isUserInteracted ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-zinc-300 font-medium">
            {isAutoPlaying && !isUserInteracted ? "Auto Demo: Cycling Cities" : "Manual Mode (Paused)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsAutoPlaying(!isAutoPlaying);
              if (!isAutoPlaying) setIsUserInteracted(false);
            }}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[11px] text-zinc-200 transition-colors"
          >
            {isAutoPlaying && !isUserInteracted ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleResetDemo}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 text-xs">
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => handleManualCity(c)}
              className={"px-2.5 py-1 rounded-lg transition-colors " + (city === c ? "bg-indigo-600 text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white")}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={handleManualUnit}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-indigo-300 border border-white/5 transition-colors"
          title="Toggle Celsius / Fahrenheit"
        >
          °{unit}
        </button>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/30 to-violet-900/30 border border-indigo-500/20 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase font-bold text-indigo-400 tracking-wider">{city}</div>
          <div className="text-4xl font-extrabold text-white mt-1">{temp}°{unit}</div>
          <div className="text-xs text-zinc-300 mt-1">{current.condition}</div>
        </div>
        <div className="text-5xl">{current.icon}</div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5">
          <div className="text-zinc-500 text-[10px]">Humidity</div>
          <div className="font-bold text-white mt-0.5">{current.humidity}%</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5">
          <div className="text-zinc-500 text-[10px]">Wind Speed</div>
          <div className="font-bold text-white mt-0.5">{current.wind}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5">
          <div className="text-zinc-500 text-[10px]">Air Quality</div>
          <div className="font-bold text-emerald-400 mt-0.5">{current.aqi}</div>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 text-center pt-1 border-t border-white/5">
        Simulated Atmospheric Sensor Telemetry • Demonstration Data
      </div>
    </div>
  );
}`,
  },
  {
    id: "smart-calculator",
    title: "Scientific Pocket Calculator",
    badge: "Interactive Utility",
    prompt: "Build an interactive dark-themed pocket calculator with clear memory, arithmetic operators, and percentage calculations in React.",
    description: "Here is the interactive calculator component with automatic calculation demonstration, responsive keys, and full operational logic:",
    language: "jsx",
    code: `export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [resetNext, setResetNext] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isUserInteracted, setIsUserInteracted] = useState(false);
  const [activeExpression, setActiveExpression] = useState("9 × 5 =");

  const calculate = (a, b, operation) => {
    switch (operation) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? Math.round((a / b) * 10000) / 10000 : "Error";
      default: return b;
    }
  };

  // Autonomous Demonstration Sequence
  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isAutoPlaying || isUserInteracted || prefersReducedMotion) return;

    const demoSequences = [
      { a: 9, op: "×", b: 5, expr: "9 × 5 =" },
      { a: 12, op: "+", b: 8, expr: "12 + 8 =" },
      { a: 100, op: "÷", b: 4, expr: "100 ÷ 4 =" },
      { a: 85, op: "-", b: 27, expr: "85 - 27 =" },
    ];

    let currentDemoIdx = 0;
    let timer = null;

    const runSequence = () => {
      const target = demoSequences[currentDemoIdx % demoSequences.length];
      setActiveExpression(target.expr);

      // Step 1: Input first operand
      setDisplay(String(target.a));
      setPrev(target.a);
      setOp(target.op);

      timer = setTimeout(() => {
        if (document.hidden) {
          timer = setTimeout(runSequence, 2000);
          return;
        }

        // Step 2: Input second operand & compute
        const result = calculate(target.a, target.b, target.op);
        setDisplay(String(result));
        setPrev(null);
        setOp(null);

        // Schedule next sequence
        currentDemoIdx++;
        timer = setTimeout(runSequence, 3200);
      }, 1500);
    };

    runSequence();

    const handleVisibility = () => {
      if (document.hidden && timer) clearTimeout(timer);
      else if (!document.hidden) runSequence();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAutoPlaying, isUserInteracted]);

  const handleDigit = (d) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    if (display === "0" || resetNext) {
      setDisplay(String(d));
      setResetNext(false);
    } else {
      setDisplay(display + d);
    }
  };

  const handleOp = (nextOp) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    const val = parseFloat(display);
    if (prev === null) {
      setPrev(val);
    } else if (op) {
      const res = calculate(prev, val, op);
      setPrev(res);
      setDisplay(String(res));
    }
    setOp(nextOp);
    setResetNext(true);
    setActiveExpression(prev !== null ? prev + " " + nextOp : val + " " + nextOp);
  };

  const handleEquals = () => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    if (op && prev !== null) {
      const val = parseFloat(display);
      const res = calculate(prev, val, op);
      setActiveExpression(prev + " " + op + " " + val + " =");
      setDisplay(String(res));
      setPrev(null);
      setOp(null);
      setResetNext(true);
    }
  };

  const handleClear = () => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setResetNext(false);
    setActiveExpression("Ready");
  };

  const handlePercent = () => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setDisplay(String(parseFloat(display) / 100));
  };

  const handleResetDemo = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setIsUserInteracted(false);
    setIsAutoPlaying(true);
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 text-white max-w-xs mx-auto shadow-2xl font-mono">
      {/* Auto-Demo Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={"w-2 h-2 rounded-full " + (isAutoPlaying && !isUserInteracted ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-zinc-300 text-[11px] font-medium truncate">
            {isAutoPlaying && !isUserInteracted ? "Auto Calc Active" : "Manual Mode"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsAutoPlaying(!isAutoPlaying);
              if (!isAutoPlaying) setIsUserInteracted(false);
            }}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[10px] text-zinc-200 transition-colors"
          >
            {isAutoPlaying && !isUserInteracted ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleResetDemo}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-zinc-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between my-2 text-xs text-zinc-400">
        <span className="font-semibold uppercase text-indigo-400">Nexora Calc</span>
        <span className="text-zinc-400 text-[11px] font-mono">{activeExpression}</span>
      </div>

      <div className="p-4 rounded-xl bg-slate-950 border border-white/5 text-right text-3xl font-bold tracking-wider mb-4 overflow-x-auto text-emerald-400">
        {display}
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
        <button onClick={handleClear} className="p-3 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors">C</button>
        <button onClick={handlePercent} className="p-3 rounded-xl bg-slate-800 text-zinc-300 hover:bg-slate-700 transition-colors">%</button>
        <button onClick={() => setDisplay(String(-parseFloat(display)))} className="p-3 rounded-xl bg-slate-800 text-zinc-300 hover:bg-slate-700 transition-colors">±</button>
        <button onClick={() => handleOp("÷")} className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">÷</button>

        {[7, 8, 9].map((n) => (
          <button key={n} onClick={() => handleDigit(n)} className="p-3 rounded-xl bg-slate-950/80 text-zinc-200 hover:bg-slate-800 border border-white/5 transition-colors">{n}</button>
        ))}
        <button onClick={() => handleOp("×")} className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">×</button>

        {[4, 5, 6].map((n) => (
          <button key={n} onClick={() => handleDigit(n)} className="p-3 rounded-xl bg-slate-950/80 text-zinc-200 hover:bg-slate-800 border border-white/5 transition-colors">{n}</button>
        ))}
        <button onClick={() => handleOp("-")} className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">-</button>

        {[1, 2, 3].map((n) => (
          <button key={n} onClick={() => handleDigit(n)} className="p-3 rounded-xl bg-slate-950/80 text-zinc-200 hover:bg-slate-800 border border-white/5 transition-colors">{n}</button>
        ))}
        <button onClick={() => handleOp("+")} className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">+</button>

        <button onClick={() => handleDigit(0)} className="col-span-2 p-3 rounded-xl bg-slate-950/80 text-zinc-200 hover:bg-slate-800 border border-white/5 transition-colors">0</button>
        <button onClick={() => !display.includes(".") && setDisplay(display + ".")} className="p-3 rounded-xl bg-slate-950/80 text-zinc-200 hover:bg-slate-800 border border-white/5 transition-colors">.</button>
        <button onClick={handleEquals} className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold transition-colors shadow-lg shadow-emerald-600/30">=</button>
      </div>
    </div>
  );
}`,
  },
  {
    id: "shopping-cart",
    title: "E-Commerce Cart & Discount Calculator",
    badge: "E-Commerce",
    prompt: "Design an interactive shopping cart with item quantity steppers, coupon code application, and tax breakdown.",
    description: "Here is the interactive cart calculation component with automatic checkout simulation, quantity updates, and coupon application:",
    language: "jsx",
    code: `export default function ShoppingCart() {
  const [items, setItems] = useState([
    { id: 1, name: "Nexora Pro Seat", price: 1999, qty: 1 },
    { id: 2, name: "Vector Index Add-on", price: 499, qty: 2 },
  ]);
  const [coupon, setCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponStatus, setCouponStatus] = useState("");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  // Autonomous Demonstration Sequence
  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isAutoPlaying || isUserInteracted || prefersReducedMotion) return;

    let step = 0;
    let timer = null;

    const runStep = () => {
      if (document.hidden) {
        timer = setTimeout(runStep, 2000);
        return;
      }

      if (step === 0) {
        // Step 1: Increment Nexora Pro Seat qty
        setItems((prev) => prev.map((i) => (i.id === 1 ? { ...i, qty: 2 } : i)));
        step = 1;
        timer = setTimeout(runStep, 2500);
      } else if (step === 1) {
        // Step 2: Auto-apply discount coupon NEXORA10
        setCoupon("NEXORA10");
        setDiscountPercent(10);
        setCouponStatus("10% Coupon Applied! ✓");
        step = 2;
        timer = setTimeout(runStep, 2800);
      } else if (step === 2) {
        // Step 3: Increment Vector Add-on qty
        setItems((prev) => prev.map((i) => (i.id === 2 ? { ...i, qty: 3 } : i)));
        step = 3;
        timer = setTimeout(runStep, 3000);
      } else {
        // Reset cycle
        setItems([
          { id: 1, name: "Nexora Pro Seat", price: 1999, qty: 1 },
          { id: 2, name: "Vector Index Add-on", price: 499, qty: 2 },
        ]);
        setCoupon("");
        setDiscountPercent(0);
        setCouponStatus("");
        step = 0;
        timer = setTimeout(runStep, 3500);
      }
    };

    timer = setTimeout(runStep, 2000);

    const handleVisibility = () => {
      if (document.hidden && timer) clearTimeout(timer);
      else if (!document.hidden) runStep();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAutoPlaying, isUserInteracted]);

  const updateQty = (id, delta) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setItems(items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  };

  const applyCoupon = () => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    if (coupon.trim().toUpperCase() === "NEXORA10") {
      setDiscountPercent(10);
      setCouponStatus("10% Coupon Applied! ✓");
    } else {
      setDiscountPercent(0);
      setCouponStatus("Invalid Coupon code");
    }
  };

  const handleResetDemo = () => {
    setItems([
      { id: 1, name: "Nexora Pro Seat", price: 1999, qty: 1 },
      { id: 2, name: "Vector Index Add-on", price: 499, qty: 2 },
    ]);
    setCoupon("");
    setDiscountPercent(0);
    setCouponStatus("");
    setIsUserInteracted(false);
    setIsAutoPlaying(true);
  };

  const subtotal = items.reduce((acc, i) => acc + i.price * i.qty, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const tax = Math.round((subtotal - discountAmount) * 0.18);
  const total = subtotal - discountAmount + tax;

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 text-white max-w-md mx-auto shadow-2xl space-y-4 font-sans">
      {/* Auto-Demo Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className={"w-2 h-2 rounded-full " + (isAutoPlaying && !isUserInteracted ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-zinc-300 font-medium">
            {isAutoPlaying && !isUserInteracted ? "Auto Demo: Simulating Cart" : "Manual Mode"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsAutoPlaying(!isAutoPlaying);
              if (!isAutoPlaying) setIsUserInteracted(false);
            }}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[11px] text-zinc-200 transition-colors"
          >
            {isAutoPlaying && !isUserInteracted ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleResetDemo}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pb-1 border-b border-white/5">
        <h3 className="font-bold text-base text-white">Subscription Checkout</h3>
        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">Test Mode</span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-zinc-200">{item.name}</div>
              <div className="text-zinc-500 text-[11px]">₹{item.price.toLocaleString()} each</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-zinc-300 font-bold">-</button>
              <span className="font-mono w-4 text-center">{item.qty}</span>
              <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-zinc-300 font-bold">+</button>
              <span className="font-bold text-indigo-300 ml-2 w-16 text-right">₹{(item.price * item.qty).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={coupon}
          onChange={(e) => {
            setIsAutoPlaying(false);
            setIsUserInteracted(true);
            setCoupon(e.target.value);
          }}
          placeholder="Code (try NEXORA10)"
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white uppercase focus:outline-none focus:border-indigo-500"
        />
        <button onClick={applyCoupon} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">
          Apply
        </button>
      </div>
      {couponStatus && (
        <div className={"text-[11px] " + (discountPercent > 0 ? "text-emerald-400" : "text-rose-400")}>{couponStatus}</div>
      )}

      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5 text-xs text-zinc-300">
        <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div>
        {discountPercent > 0 && (
          <div className="flex justify-between text-emerald-400"><span>Discount (10%):</span><span>-₹{discountAmount.toLocaleString()}</span></div>
        )}
        <div className="flex justify-between text-zinc-400"><span>GST (18%):</span><span>₹{tax.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/10">
          <span>Total:</span><span className="text-indigo-400">₹{total.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 text-center">
        Simulated Shopping Cart • No Real Transactions or Charges
      </div>
    </div>
  );
}`,
  },
  {
    id: "analytics-card",
    title: "Inference Analytics Metric",
    badge: "Telemetry & Quotas",
    prompt: "Generate an interactive analytics metric card with latency, token rate, and progress badge in React & Tailwind CSS.",
    description: "Here is the production-ready React component with automatic metric state updates, interactive tabs, and Tailwind styling:",
    language: "jsx",
    code: `export default function AnalyticsCard() {
  const [timeframe, setTimeframe] = useState("24h");
  const [tokens, setTokens] = useState(28410);
  const [exported, setExported] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  const metrics = {
    "24h": { tokens: 28410, change: "+14.2%", latency: "290ms", success: "99.99%", quota: 42 },
    "7d": { tokens: 142890, change: "+28.4%", latency: "340ms", success: "99.98%", quota: 72 },
    "30d": { tokens: 684200, change: "+41.8%", latency: "360ms", success: "99.95%", quota: 88 },
  };

  // Autonomous Demonstration Sequence
  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isAutoPlaying || isUserInteracted || prefersReducedMotion) return;

    let step = 0;
    let timer = null;

    const runStep = () => {
      if (document.hidden) {
        timer = setTimeout(runStep, 2000);
        return;
      }

      if (step === 0) {
        // Step 1: Switch to 7d
        setTimeframe("7d");
        setTokens(metrics["7d"].tokens);
        step = 1;
        timer = setTimeout(runStep, 2800);
      } else if (step === 1) {
        // Step 2: Simulate query burst
        setTokens((prev) => prev + 3200);
        step = 2;
        timer = setTimeout(runStep, 2400);
      } else if (step === 2) {
        // Step 3: Switch to 30d
        setTimeframe("30d");
        setTokens(metrics["30d"].tokens);
        step = 3;
        timer = setTimeout(runStep, 2800);
      } else if (step === 3) {
        // Step 4: Export report simulation
        setExported(true);
        timer = setTimeout(() => {
          setExported(false);
          // Loop back to 24h
          setTimeframe("24h");
          setTokens(metrics["24h"].tokens);
          step = 0;
          timer = setTimeout(runStep, 3000);
        }, 2000);
      }
    };

    timer = setTimeout(runStep, 2200);

    const handleVisibility = () => {
      if (document.hidden && timer) clearTimeout(timer);
      else if (!document.hidden) runStep();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAutoPlaying, isUserInteracted]);

  const handleManualTimeframe = (t) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setTimeframe(t);
    setTokens(metrics[t].tokens);
  };

  const handleSimulate = () => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setTokens((prev) => prev + 2500);
  };

  const handleExport = () => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleResetDemo = () => {
    setTimeframe("24h");
    setTokens(metrics["24h"].tokens);
    setExported(false);
    setIsUserInteracted(false);
    setIsAutoPlaying(true);
  };

  const current = metrics[timeframe] || metrics["7d"];

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 text-white max-w-md mx-auto shadow-2xl space-y-4 font-sans">
      {/* Auto-Demo Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className={"w-2 h-2 rounded-full " + (isAutoPlaying && !isUserInteracted ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-zinc-300 font-medium">
            {isAutoPlaying && !isUserInteracted ? "Auto Demo: Streaming Telemetry" : "Manual Mode"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsAutoPlaying(!isAutoPlaying);
              if (!isAutoPlaying) setIsUserInteracted(false);
            }}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[11px] text-zinc-200 transition-colors"
          >
            {isAutoPlaying && !isUserInteracted ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleResetDemo}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Total Inference</span>
          <h3 className="text-2xl font-bold mt-0.5">{tokens.toLocaleString()} tokens</h3>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 text-xs font-semibold">
          {["24h", "7d", "30d"].map((t) => (
            <button
              key={t}
              onClick={() => handleManualTimeframe(t)}
              className={"px-2.5 py-1 rounded transition-colors " + (timeframe === t ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
          <div className="text-[11px] text-zinc-400">Avg. Latency</div>
          <div className="text-lg font-bold text-white mt-0.5">{current.latency}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
          <div className="text-[11px] text-zinc-400">Success Rate</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{current.success}</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Monthly Quota Utilized</span>
          <span className="text-indigo-300 font-semibold">{current.quota}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
          <div
            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
            style={{ width: current.quota + "%" }}
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-white/5">
        <button
          onClick={handleSimulate}
          className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-semibold transition-colors"
        >
          + Simulate Query
        </button>
        <button
          onClick={handleExport}
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          {exported ? "Report Exported ✓" : "Export Report →"}
        </button>
      </div>

      <div className="text-[10px] text-zinc-500 text-center">
        Simulated Metrics Dashboard • Demonstration Telemetry
      </div>
    </div>
  );
}`,
  },
  {
    id: "task-manager",
    title: "Agile Task & Sprint Tracker",
    badge: "Productivity",
    prompt: "Create an interactive sprint task manager with priority tags, item completion toggles, and new task inputs.",
    description: "Here is the sprint task manager component with automatic task completion demonstration, add, toggle, and delete features:",
    language: "jsx",
    code: `export default function TaskManager() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Verify RLS policies on Supabase", priority: "High", done: true },
    { id: 2, text: "Audit token usage per organization", priority: "High", done: false },
    { id: 3, text: "Benchmark Claude 3.5 Sonnet latency", priority: "Medium", done: false },
    { id: 4, text: "Configure Razorpay test webhook", priority: "Low", done: false },
  ]);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("High");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  // Autonomous Demonstration Sequence
  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isAutoPlaying || isUserInteracted || prefersReducedMotion) return;

    let step = 0;
    let timer = null;

    const runStep = () => {
      if (document.hidden) {
        timer = setTimeout(runStep, 2000);
        return;
      }

      if (step === 0) {
        // Step 1: Add a sample automated task
        setTasks((prev) => [
          ...prev,
          { id: 999, text: "Evaluate multi-modal vision parsing", priority: "High", done: false },
        ]);
        step = 1;
        timer = setTimeout(runStep, 2600);
      } else if (step === 1) {
        // Step 2: Mark task #2 complete
        setTasks((prev) => prev.map((t) => (t.id === 2 ? { ...t, done: true } : t)));
        step = 2;
        timer = setTimeout(runStep, 2600);
      } else if (step === 2) {
        // Step 3: Mark newly added task complete
        setTasks((prev) => prev.map((t) => (t.id === 999 ? { ...t, done: true } : t)));
        step = 3;
        timer = setTimeout(runStep, 3000);
      } else {
        // Reset to initial baseline
        setTasks([
          { id: 1, text: "Verify RLS policies on Supabase", priority: "High", done: true },
          { id: 2, text: "Audit token usage per organization", priority: "High", done: false },
          { id: 3, text: "Benchmark Claude 3.5 Sonnet latency", priority: "Medium", done: false },
          { id: 4, text: "Configure Razorpay test webhook", priority: "Low", done: false },
        ]);
        step = 0;
        timer = setTimeout(runStep, 3500);
      }
    };

    timer = setTimeout(runStep, 2200);

    const handleVisibility = () => {
      if (document.hidden && timer) clearTimeout(timer);
      else if (!document.hidden) runStep();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAutoPlaying, isUserInteracted]);

  const handleAdd = (e) => {
    e.preventDefault();
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    if (!input.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: input.trim(), priority, done: false }]);
    setInput("");
  };

  const toggleTask = (id) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTask = (id) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleResetDemo = () => {
    setTasks([
      { id: 1, text: "Verify RLS policies on Supabase", priority: "High", done: true },
      { id: 2, text: "Audit token usage per organization", priority: "High", done: false },
      { id: 3, text: "Benchmark Claude 3.5 Sonnet latency", priority: "Medium", done: false },
      { id: 4, text: "Configure Razorpay test webhook", priority: "Low", done: false },
    ]);
    setInput("");
    setIsUserInteracted(false);
    setIsAutoPlaying(true);
  };

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 text-white max-w-md mx-auto shadow-2xl space-y-4 font-sans">
      {/* Auto-Demo Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className={"w-2 h-2 rounded-full " + (isAutoPlaying && !isUserInteracted ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-zinc-300 font-medium">
            {isAutoPlaying && !isUserInteracted ? "Auto Demo: Tracking Sprint" : "Manual Mode"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsAutoPlaying(!isAutoPlaying);
              if (!isAutoPlaying) setIsUserInteracted(false);
            }}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[11px] text-zinc-200 transition-colors"
          >
            {isAutoPlaying && !isUserInteracted ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleResetDemo}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Sprint Backlog</span>
          <h3 className="text-xl font-bold mt-0.5">Engine Sprint #14</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          {completedCount}/{tasks.length} Completed
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setIsAutoPlaying(false);
            setIsUserInteracted(true);
            setInput(e.target.value);
          }}
          placeholder="New task description..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={priority}
          onChange={(e) => {
            setIsAutoPlaying(false);
            setIsUserInteracted(true);
            setPriority(e.target.value);
          }}
          className="px-2 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <button type="submit" className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition-colors">
          Add
        </button>
      </form>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={"p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors " + (task.done ? "bg-slate-950/40 border-white/5 opacity-60" : "bg-slate-950/90 border-white/10")}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/20 focus:ring-0 cursor-pointer"
              />
              <span className={"truncate " + (task.done ? "line-through text-zinc-500" : "text-zinc-200")}>
                {task.text}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (task.priority === "High" ? "bg-rose-500/20 text-rose-300" : task.priority === "Medium" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300")}>
                {task.priority}
              </span>
              <button onClick={() => removeTask(task.id)} className="text-zinc-500 hover:text-rose-400 p-0.5">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`,
  },
  {
    id: "pricing-calculator",
    title: "Usage-Based Cost Estimator",
    badge: "Billing & Plans",
    prompt: "Develop an interactive slider-based pricing calculator for monthly active users and token bandwidth in React.",
    description: "Here is the interactive estimation slider component with automatic tier calculation and real-time cost updates:",
    language: "jsx",
    code: `export default function PricingCalculator() {
  const [users, setUsers] = useState(25);
  const [tokensM, setTokensM] = useState(10);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  // Autonomous Demonstration Sequence
  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isAutoPlaying || isUserInteracted || prefersReducedMotion) return;

    let step = 0;
    let timer = null;

    const runStep = () => {
      if (document.hidden) {
        timer = setTimeout(runStep, 2000);
        return;
      }

      if (step === 0) {
        // Step 1: Slide seats to 50
        setUsers(50);
        step = 1;
        timer = setTimeout(runStep, 2600);
      } else if (step === 1) {
        // Step 2: Slide bandwidth to 40M tokens
        setTokensM(40);
        step = 2;
        timer = setTimeout(runStep, 2600);
      } else if (step === 2) {
        // Step 3: Slide seats to 75 (Enterprise tier)
        setUsers(75);
        step = 3;
        timer = setTimeout(runStep, 3000);
      } else {
        // Reset to baseline
        setUsers(25);
        setTokensM(10);
        step = 0;
        timer = setTimeout(runStep, 3500);
      }
    };

    timer = setTimeout(runStep, 2200);

    const handleVisibility = () => {
      if (document.hidden && timer) clearTimeout(timer);
      else if (!document.hidden) runStep();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAutoPlaying, isUserInteracted]);

  const handleUsersChange = (val) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setUsers(val);
  };

  const handleTokensChange = (val) => {
    setIsAutoPlaying(false);
    setIsUserInteracted(true);
    setTokensM(val);
  };

  const handleResetDemo = () => {
    setUsers(25);
    setTokensM(10);
    setIsUserInteracted(false);
    setIsAutoPlaying(true);
  };

  // Pricing formula: ₹150 per seat + ₹80 per 1M tokens
  const seatCost = users * 150;
  const tokenCost = tokensM * 80;
  const total = seatCost + tokenCost;

  const planRecommendation = users > 50 || tokensM > 50 ? "Enterprise" : users > 5 ? "Pro Team" : "Starter";

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 text-white max-w-md mx-auto shadow-2xl space-y-4 font-sans">
      {/* Auto-Demo Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className={"w-2 h-2 rounded-full " + (isAutoPlaying && !isUserInteracted ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          <span className="text-zinc-300 font-medium">
            {isAutoPlaying && !isUserInteracted ? "Auto Demo: Estimating Capacity" : "Manual Mode"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsAutoPlaying(!isAutoPlaying);
              if (!isAutoPlaying) setIsUserInteracted(false);
            }}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[11px] text-zinc-200 transition-colors"
          >
            {isAutoPlaying && !isUserInteracted ? "Pause" : "Resume"}
          </button>
          <button
            onClick={handleResetDemo}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pb-1 border-b border-white/5">
        <div>
          <span className="text-xs uppercase font-bold text-indigo-400">Capacity Estimator</span>
          <h3 className="font-bold text-lg">Inference Pricing</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          Tier: {planRecommendation}
        </span>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <div className="flex justify-between text-zinc-300 mb-1.5">
            <span>Team Members (Seats):</span>
            <span className="font-mono font-bold text-indigo-300">{users} users</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={users}
            onChange={(e) => handleUsersChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-zinc-300 mb-1.5">
            <span>Monthly Inference:</span>
            <span className="font-mono font-bold text-indigo-300">{tokensM}M tokens</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={tokensM}
            onChange={(e) => handleTokensChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Base Seat Allocation:</span>
          <span>₹{seatCost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Inference Bandwidth:</span>
          <span>₹{tokenCost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
          <span className="text-xs text-zinc-300">Estimated Total:</span>
          <span className="text-2xl font-extrabold text-white">₹{total.toLocaleString()} <span className="text-xs font-normal text-zinc-400">/ mo</span></span>
        </div>
      </div>
    </div>
  );
}`,
  },
];

const STORAGE_KEY = "nexora_last_demo_id";

/**
 * Returns a demo example with repeat prevention.
 * If currentId is provided, picks the next demo differing from it.
 */
export function getNextDemoExample(currentId?: string): DemoExample {
  if (!HOMEPAGE_DEMOS || HOMEPAGE_DEMOS.length === 0) {
    throw new Error("No demo examples configured");
  }

  if (HOMEPAGE_DEMOS.length === 1) {
    return HOMEPAGE_DEMOS[0];
  }

  // Filter out the currently displayed demo if possible
  const candidates = HOMEPAGE_DEMOS.filter((d) => d.id !== currentId);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)] || HOMEPAGE_DEMOS[0];

  // Safely record in client session storage if available
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, chosen.id);
    } catch (e) {
      // Storage might be restricted in private mode
    }
  }

  return chosen;
}

/**
 * Deterministically cycles to the next or previous demo in order.
 */
export function cycleDemoExample(currentId?: string, direction: 1 | -1 = 1): DemoExample {
  if (!HOMEPAGE_DEMOS || HOMEPAGE_DEMOS.length === 0) {
    throw new Error("No demo examples configured");
  }

  const currentIndex = HOMEPAGE_DEMOS.findIndex((d) => d.id === currentId);
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + direction + HOMEPAGE_DEMOS.length) % HOMEPAGE_DEMOS.length;
  const chosen = HOMEPAGE_DEMOS[nextIndex];

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, chosen.id);
    } catch (e) {
      // Storage might be restricted in private mode
    }
  }

  return chosen;
}

/**
 * Reads the last viewed demo ID from sessionStorage or returns null.
 */
export function getLastViewedDemoId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}
