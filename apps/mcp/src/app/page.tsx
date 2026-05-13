export default function Page() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>YouPD MCP server</h1>
      <p>
        MCP endpoint: <code>/api/mcp</code>
      </p>
      <p>
        Discovery: <code>/.well-known/oauth-authorization-server</code>,{' '}
        <code>/.well-known/oauth-protected-resource</code>
      </p>
    </main>
  );
}
