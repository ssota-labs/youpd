> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Installation

> Install the Notion CLI on your machine.

## Install via script (recommended)

The recommended way to install `ntn`:

```bash theme={null}
curl -fsSL https://ntn.dev | bash
```

<Note>
  `ntn` is available for macOS and Linux (x64 and arm64). Windows support coming soon!
</Note>

## Install via npm

```bash theme={null}
npm install --global ntn
```

<Note>
  Requires Node.js 22+ and npm 10+.
</Note>

## Verify installation

```bash theme={null}
ntn --version
```

## Shell completions

Enable tab completions for your shell:

```bash theme={null}
ntn completions bash  # or fish, zsh, powershell, elvish
```

## Building from source

Clone the repository and use [mise](https://mise.jdx.dev/) to build a local debug binary installed as `ntnd`:

```bash theme={null}
git clone https://github.com/makenotion/cli.git
cd cli
mise build
```

See the [CLI README](https://github.com/makenotion/cli/blob/main/README.md#building-from-source) for `mise watch` and other development workflows.

## Next steps

<CardGroup cols={2}>
  <Card title="Authentication" icon="lock" href="/cli/get-started/authentication">
    Log in to your Notion workspace.
  </Card>

  <Card title="Workers quickstart" icon="rocket" href="/workers/get-started/quickstart">
    Create and deploy your first Notion Worker.
  </Card>
</CardGroup>
