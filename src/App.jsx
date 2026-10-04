import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api, signOut } from "./api";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function Shell({ me, children, onSignOut }) {
  return (
    <div className="shell">
      <aside>
        <div className="brand">Veyra</div>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/agents">Agents</NavLink>
          <NavLink to="/call">Place a call</NavLink>
          <NavLink to="/billing">Billing</NavLink>
          <NavLink to="/hvac">HVAC</NavLink>
          <NavLink to="/demo-links">Demo links</NavLink>
        </nav>
        <div className="who">
          <strong>{me.user.name}</strong>
          <span>{me.tenant.name}</span>
          <button type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}

function SignIn() {
  return (
    <section className="signin">
      <div>
        <p className="eyebrow">Veyra</p>
        <h1>Sign in to place calls and read the outcome.</h1>
        <p>Google checks the address, then Veyra accepts it only when it is on the allowlist.</p>
        <a className="button" href="/api/auth/google" data-client-id={clientId}>Continue with Google</a>
      </div>
    </section>
  );
}

function Home() {
  const [usage, setUsage] = useState(null);
  const [calls, setCalls] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api("/api/usage"), api("/api/calls")])
      .then(([usageBody, callBody]) => {
        setUsage(usageBody);
        setCalls(callBody.calls || []);
      })
      .catch((err) => setError(err.message));
  }, []);
  return (
    <section>
      <h1>Home</h1>
      {error && <p className="error">{error}</p>}
      <div className="stats">
        <article><span>Calls</span><strong>{usage ? usage.totals.calls : "…"}</strong></article>
        <article><span>Characters</span><strong>{usage ? usage.totals.chars : "…"}</strong></article>
        <article><span>Estimated INR</span><strong>{usage ? usage.totals.costInr : "…"}</strong></article>
      </div>
      <h2>Last calls</h2>
      <CallTable calls={calls} />
    </section>
  );
}

function CallTable({ calls }) {
  if (!calls.length) return <p className="muted">No calls yet.</p>;
  return (
    <table>
      <thead><tr><th>When</th><th>To</th><th>Status</th><th>Name</th></tr></thead>
      <tbody>
        {calls.map((call) => (
          <tr key={call.id}>
            <td>{new Date(call.createdAt).toLocaleString()}</td>
            <td><Link to={`/calls/${call.id}`}>{call.to}</Link></td>
            <td>{call.status}</td>
            <td>{call.extracted?.caller_name || call.variables?.contact_name || ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Agents() {
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState({ name: "", persona: "", greeting: "", model: "mulberry" });
  const [error, setError] = useState("");
  function load() {
    api("/api/agents").then((body) => setAgents(body.agents || [])).catch((err) => setError(err.message));
  }
  useEffect(load, []);
  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/agents", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          persona: form.persona,
          greeting: form.greeting,
          tts: { model: form.model, speaker: "speaker_1" },
        }),
      });
      setForm({ name: "", persona: "", greeting: "", model: "mulberry" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <section>
      <h1>Agents</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={create} className="stack">
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label>Persona<textarea value={form.persona} onChange={(event) => setForm({ ...form, persona: event.target.value })} /></label>
        <label>Greeting<textarea value={form.greeting} onChange={(event) => setForm({ ...form, greeting: event.target.value })} /></label>
        <label>Voice
          <select value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })}>
            <option value="mulberry">mulberry</option>
            <option value="muga">muga</option>
          </select>
        </label>
        <button type="submit">Save agent</button>
      </form>
      <ul className="cards">
        {agents.map((agent) => (
          <li key={agent.id}>
            <strong>{agent.name}</strong>
            <p>{agent.greeting || agent.persona}</p>
            <span>{agent.tts?.model} · {agent.tts?.speaker}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlaceCall() {
  const navigate = useNavigate();
  const [to, setTo] = useState("+91");
  const [contactName, setContactName] = useState("");
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const body = await api("/api/calls", {
        method: "POST",
        body: JSON.stringify({ to, variables: { contact_name: contactName } }),
      });
      navigate(`/calls/${body.call.id}`);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <section>
      <h1>Place a call</h1>
      <p className="muted">This dials through Dograh workflow 1.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit} className="stack">
        <label>Destination<input value={to} onChange={(event) => setTo(event.target.value)} placeholder="+9198…" required /></label>
        <label>Contact name<input value={contactName} onChange={(event) => setContactName(event.target.value)} /></label>
        <button type="submit">Dial</button>
      </form>
    </section>
  );
}

function CallDetail() {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`/api/calls/${id}`).then((body) => setCall(body.call)).catch((err) => setError(err.message));
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!call) return <p>Loading call…</p>;
  const fields = call.extracted || {};
  return (
    <section>
      <h1>{call.to}</h1>
      <p className="muted">{call.status} · workflow {call.workflowId}</p>
      {call.recordingUrl && <audio controls src={call.recordingUrl} />}
      <h2>Extracted fields</h2>
      <dl className="fields">
        <div><dt>Caller name</dt><dd>{fields.caller_name || "Not captured"}</dd></div>
        <div><dt>Requirement</dt><dd>{fields.requirement || "Not captured"}</dd></div>
        <div><dt>Language</dt><dd>{fields.language || "Not captured"}</dd></div>
        <div><dt>Next step</dt><dd>{fields.next_step || "Not captured"}</dd></div>
        <div><dt>Opted out</dt><dd>{fields.opted_out ? "Yes" : "No"}</dd></div>
      </dl>
      <h2>Transcript</h2>
      <pre>{call.transcript || "No transcript yet."}</pre>
    </section>
  );
}

function Billing() {
  const [wallet, setWallet] = useState(null);
  const [intents, setIntents] = useState([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    Promise.all([api("/api/wallet"), api("/api/payment-intents")]).then(([walletBody, intentBody]) => {
      setWallet(walletBody);
      setIntents(intentBody.paymentIntents || []);
    }).catch((err) => setMessage(err.message));
  }, []);
  async function buy(packId) {
    setMessage("");
    try {
      const body = await api("/api/payment-intents", { method: "POST", body: JSON.stringify({ packId, firstname: "Customer" }) });
      setMessage(body.message || (body.checkoutReady ? "Checkout is ready." : "Intent saved."));
      if (body.checkout?.url && body.checkout.fields) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = body.checkout.url;
        Object.entries(body.checkout.fields).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      setMessage(err.message);
    }
  }
  return (
    <section>
      <h1>Billing</h1>
      <p>Balance: {wallet ? `₹${wallet.wallet.balanceInr}` : "…"}</p>
      {message && <p>{message}</p>}
      <div className="stats">
        {["starter", "growth", "scale"].map((pack) => (
          <article key={pack}><span>{pack}</span><button type="button" onClick={() => buy(pack)}>Buy</button></article>
        ))}
      </div>
      <ul className="cards">
        {intents.map((intent) => <li key={intent.id}><strong>{intent.packId}</strong><span>{intent.status} · {intent.amount}</span></li>)}
      </ul>
    </section>
  );
}

function Hvac() {
  const [desk, setDesk] = useState(null);
  const [form, setForm] = useState({ callerName: "", phone: "", service: "General HVAC", notes: "" });
  const [error, setError] = useState("");
  function load() {
    api("/api/hvac/desk").then(setDesk).catch((err) => setError(err.message));
  }
  useEffect(load, []);
  async function save(event) {
    event.preventDefault();
    try {
      await api("/api/hvac/jobs", { method: "POST", body: JSON.stringify(form) });
      setForm({ callerName: "", phone: "", service: "General HVAC", notes: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <section>
      <h1>HVAC desk</h1>
      {error && <p className="error">{error}</p>}
      <p className="muted">{desk ? `${desk.stats.calls} jobs · ${desk.stats.booked} booked` : "Loading…"}</p>
      <form onSubmit={save} className="stack">
        <label>Caller<input value={form.callerName} onChange={(event) => setForm({ ...form, callerName: event.target.value })} required /></label>
        <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></label>
        <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <button type="submit">Save job</button>
      </form>
      <ul className="cards">
        {(desk?.jobs || []).map((job) => <li key={job.id}><strong>{job.callerName}</strong><span>{job.phone} · {job.outcome}</span></li>)}
      </ul>
    </section>
  );
}

function DemoLinks() {
  const [agents, setAgents] = useState([]);
  const [links, setLinks] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [share, setShare] = useState("");
  const [error, setError] = useState("");
  function load() {
    Promise.all([api("/api/agents"), api("/api/demo-links")])
      .then(([agentBody, linkBody]) => {
        setAgents(agentBody.agents || []);
        setLinks(linkBody.demoLinks || []);
        if (!agentId && agentBody.agents?.[0]) setAgentId(agentBody.agents[0].id);
      })
      .catch((err) => setError(err.message));
  }
  useEffect(load, []);
  async function create(event) {
    event.preventDefault();
    setShare("");
    try {
      const body = await api("/api/demo-links", { method: "POST", body: JSON.stringify({ agentId }) });
      setShare(body.sharePath);
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  async function revoke(id) {
    await api("/api/demo-links/revoke", { method: "POST", body: JSON.stringify({ id }) });
    load();
  }
  return (
    <section>
      <h1>Demo links</h1>
      {error && <p className="error">{error}</p>}
      {share && <p>Share path, shown once: <code>{share}</code></p>}
      <form onSubmit={create} className="stack">
        <label>Agent
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
        </label>
        <button type="submit">Create link</button>
      </form>
      <ul className="cards">
        {links.map((link) => (
          <li key={link.id}>
            <strong>{link.label}</strong>
            <span>{link.status} · {link.starts}/{link.maxStarts}</span>
            {link.status === "active" && <button type="button" onClick={() => revoke(link.id)}>Revoke</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function App() {
  const [me, setMe] = useState(undefined);
  useEffect(() => {
    api("/api/me").then(setMe).catch(() => setMe(null));
  }, []);
  if (me === undefined) return <p className="boot">Loading Veyra…</p>;
  if (!me) return <SignIn />;
  async function onSignOut() {
    await signOut();
    setMe(null);
  }
  return (
    <Shell me={me} onSignOut={onSignOut}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/call" element={<PlaceCall />} />
        <Route path="/calls/:id" element={<CallDetail />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/hvac" element={<Hvac />} />
        <Route path="/demo-links" element={<DemoLinks />} />
      </Routes>
    </Shell>
  );
}
