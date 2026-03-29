import React from 'react';
import { blogMainMenuConfig } from '../src/config/blogMainMenu';

function BlogMainMenuPreview() {
  const [openGroup, setOpenGroup] = React.useState<string | null>(blogMainMenuConfig.primary[0]?.slug ?? null);

  return (
    <section style={{ marginTop: 24, border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Blog Main Menu (Preview)</h3>
      <p style={{ marginTop: 0, color: '#4b5563' }}>
        Taxonomy SEO: Giải pháp theo vấn đề → Chức năng chính → Lợi ích triển khai.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {blogMainMenuConfig.primary.map((group) => (
          <div key={group.slug} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>{group.label}</h4>
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: 13 }}>{group.description}</p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {group.items.map((item) => (
                <li key={item.slug} style={{ marginBottom: 6 }}>
                  <strong>{item.label}</strong>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{item.description}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0, marginBottom: 8 }}>Featured posts</h4>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {blogMainMenuConfig.featured.map((item) => (
            <li key={item.slug}>
              <strong>{item.label}</strong>
              <div style={{ color: '#6b7280', fontSize: 12 }}>{item.description}</div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 16, borderTop: '1px dashed #d1d5db', paddingTop: 12 }}>
        <h4 style={{ marginTop: 0, marginBottom: 8 }}>Mobile accordion simulation</h4>
        {blogMainMenuConfig.primary.map((group) => {
          const isOpen = openGroup === group.slug;
          return (
            <div key={group.slug} style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <button
                type="button"
                style={{ width: '100%', textAlign: 'left', background: 'white', border: 'none', padding: 10, cursor: 'pointer' }}
                onClick={() => setOpenGroup(isOpen ? null : group.slug)}
              >
                {group.label}
              </button>
              {isOpen && (
                <ul style={{ margin: 0, padding: '0 16px 10px 28px' }}>
                  {group.items.map((item) => (
                    <li key={item.slug} style={{ marginBottom: 4 }}>{item.label}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <button type="button">{blogMainMenuConfig.cta.label}</button>
      </div>
    </section>
  );
}

export default function SheetsAdmin() {
  // Simple admin stub for illustration. In production, protect this behind auth.
  const [webappUrl, setWebappUrl] = React.useState('');
  const [adminToken, setAdminToken] = React.useState('');
  const [sheetUrl, setSheetUrl] = React.useState('');

  async function setSpreadsheet() {
    const res = await fetch(webappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'setSpreadsheetId', adminToken, spreadsheetUrl: sheetUrl })
    });
    try { console.log(await res.json()); } catch(e) { console.log('ok'); }
  }

  return (
    <div>
      <h3>Sheets Admin (stub)</h3>
      <div>
        <label>WebApp URL</label>
        <input value={webappUrl} onChange={e=>setWebappUrl(e.target.value)} />
      </div>
      <div>
        <label>Admin Token</label>
        <input value={adminToken} onChange={e=>setAdminToken(e.target.value)} />
      </div>
      <div>
        <label>Spreadsheet Edit URL</label>
        <input value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} />
      </div>
      <button onClick={setSpreadsheet}>Set Spreadsheet ID</button>

      <BlogMainMenuPreview />
    </div>
  );
}
