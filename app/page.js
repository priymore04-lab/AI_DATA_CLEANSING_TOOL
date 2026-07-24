'use client';

import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';

function dedupeCount(rows) {
  const seen = new Set();
  let dup = 0;
  for (const r of rows) {
    const key = JSON.stringify(r);
    if (seen.has(key)) dup++;
    else seen.add(key);
  }
  return dup;
}

export default function Home() {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [messages, setMessages] = useState([]); // {role, content, toolLog?}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pastJobs, setPastJobs] = useState([]);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!headers.length) refreshJobs();
  }, [headers.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function refreshJobs() {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((d) => setPastJobs(d.jobs || []))
      .catch(() => {});
  }

  function reset() {
    setHeaders([]);
    setRows([]);
    setFileName('');
    setMessages([]);
    setErrorMsg('');
  }

  function parseFile(file) {
    setErrorMsg('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.data.length) {
          setErrorMsg('That file appears to be empty.');
          return;
        }
        setHeaders(res.meta.fields);
        setRows(res.data);
        setFileName(file.name);
        setMessages([
          {
            role: 'assistant',
            content: `Loaded ${res.data.length} rows across ${res.meta.fields.length} columns from ${file.name}. Tell me what to clean up — for example "standardize the state column" or "remove exact duplicate rows".`,
          },
        ]);
      },
      error: (err) => setErrorMsg('Could not parse that file: ' + err.message),
    });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setErrorMsg('');
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const history = nextMessages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, headers, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent request failed');

      setHeaders(data.headers);
      setRows(data.rows);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply, toolLog: data.toolLog || [] },
      ]);
    } catch (err) {
      setErrorMsg(err.message);
      setMessages((m) => [...m, { role: 'assistant', content: "Something went wrong on that step — see the error below." }]);
    } finally {
      setBusy(false);
    }
  }

  function downloadCSV() {
    const csv = Papa.unparse({ fields: headers, data: rows.map((r) => headers.map((h) => r[h] ?? '')) });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveToAccount() {
    setBusy(true);
    try {
      const csv = Papa.unparse({ fields: headers, data: rows.map((r) => headers.map((h) => r[h] ?? '')) });
      const toolLog = messages.flatMap((m) => m.toolLog || []);
      const res = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, csv, rowCount: rows.length, toolLog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessages((m) => [...m, { role: 'assistant', content: 'Saved to your account — find it under "Your past jobs" next time you visit.' }]);
      refreshJobs();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const dupCount = rows.length ? dedupeCount(rows) : 0;

  return (
    <div className="wrap">
      <h1>Cleanslate</h1>
      <p className="sub">Tell it what to clean. It inspects your data, decides what to do, and does it.</p>

      {!headers.length && (
        <>
          <div className="card">
            <div
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]);
              }}
            >
              <p className="big">Drop a CSV file here, or click to choose one</p>
              <p>Once it's loaded, you'll chat with the agent to clean it.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}
            />
            {errorMsg && <div className="card errorcard" style={{ marginTop: 16 }}>{errorMsg}</div>}
          </div>

          {pastJobs.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>Your past jobs</h3>
              {pastJobs.map((j) => (
                <div className="issuerow" key={j.id}>
                  <div>
                    <div className="col">{j.filename}</div>
                    <div className="desc">
                      {j.row_count ?? '?'} rows &middot; {j.status} &middot; {new Date(j.created_at).toLocaleString()}
                    </div>
                  </div>
                  {j.downloadUrl ? (
                    <a href={j.downloadUrl}><button>Download</button></a>
                  ) : (
                    <span className="badge issue">not finished</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {headers.length > 0 && (
        <>
          <div className="statsgrid">
            <div className="stat"><div className="n">{rows.length}</div><div className="l">rows</div></div>
            <div className="stat"><div className="n">{headers.length}</div><div className="l">columns</div></div>
            <div className="stat"><div className="n" style={{ color: 'var(--red)' }}>{dupCount}</div><div className="l">exact duplicates</div></div>
            <div className="stat"><div className="n" style={{ color: 'var(--text-faint)', fontSize: 13, fontWeight: 500 }}>{fileName}</div><div className="l">file</div></div>
          </div>

          <div className="card">
            <div className="chatlog">
              {messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role}`}>
                  {m.content}
                  {m.toolLog && m.toolLog.length > 0 && (
                    <div className="toolnote">
                      {m.toolLog.map((t, j) => (
                        <div key={j}>
                          &rarr; {t.tool}({Object.entries(t.args).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="bubble assistant"><span className="spin" /></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="chatinput">
              <input
                type="text"
                placeholder='e.g. "standardize the state column"'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={busy}
              />
              <button className="primary" onClick={sendMessage} disabled={busy || !input.trim()}>Send</button>
            </div>
          </div>

          {errorMsg && <div className="card errorcard">{errorMsg}</div>}

          <div className="card">
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>
              Live preview <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(first 12 rows)</span>
            </h3>
            <div className="tablewrap">
              <table>
                <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, 12).map((r, i) => (
                    <tr key={i}>{headers.map((h) => <td key={h}>{r[h] ?? ''}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row">
            <button className="primary" onClick={downloadCSV}>Download CSV</button>
            <button onClick={saveToAccount} disabled={busy}>Save to your account</button>
            <button className="ghost" onClick={reset}>Start over</button>
          </div>
        </>
      )}
    </div>
  );
}
