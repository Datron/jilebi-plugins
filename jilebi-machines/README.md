# Jilebi Machines

A Jilebi plugin that exposes **microVMs**, **routes** and **SSH keys** as MCP
tools. It talks only to `https://jilebi.ai` and is scoped to the API key you
provide.

This plugin does not list templates or the software catalog. You can still
pass known `software_ids` when creating a machine. It manages machines, their
routed ports, and the SSH keys stored on the account.

## Install

```bash
jilebi plugins add jilebi-machines
```

Then set the API key when prompted:

```bash
jilebi plugins env jilebi-machines
# Enter value for env JILEBI_API_KEY: <your key>
```

Create an API key in the Jilebi dashboard. The key needs these scopes:

- `vms:read`, `vms:write`
- `routes:read`, `routes:write`
- `keys:read`, `keys:write`

Add `software:read` if you plan to pass `software_ids` when creating a
machine.

Restart the Jilebi server after changing the key.

## Tools

### MicroVMs

| Tool | Description |
| --- | --- |
| `list-machines` | List machines (optionally filter by `active`, `paused`, `offline`) |
| `get-machine` | Get one machine and its live hypervisor state |
| `create-machine` | Provision a machine; uses `ssh_key_id`, `public_key`, or the account's only saved key |
| `resize-machine` | Change vCPU, memory or disk |
| `start-machine` | Start a paused/offline machine |
| `pause-machine` | Pause an active machine |
| `restart-machine` | Restart an active machine |
| `shutdown-machine` | Gracefully shut down an active machine |
| `clone-machine` | Clone a machine under a new name |
| `delete-machine` | Permanently delete a machine and its disk |

### Routes

| Tool | Description |
| --- | --- |
| `list-routes` | List owned and shared routes |
| `create-route` | Route a machine port; resolves `machine_name` to its id |
| `update-route` | Change port, privacy, or shared emails |
| `delete-route` | Remove a route (the machine is untouched) |

### SSH keys

| Tool | Description |
| --- | --- |
| `list-ssh-keys` | List public keys and fingerprints |
| `add-ssh-key` | Upload a public key or generate a new ed25519 pair |
| `rename-ssh-key` | Change or clear a key label |
| `delete-ssh-key` | Delete a saved key |

## Examples

- "List my Jilebi machines."
- "Create a 4 vCPU / 8 GB machine called `build-box` with my saved key."
- "Pause `build-box`."
- "Expose port 3000 on `build-box` as a private route called `preview`."
- "Share the `preview` route with `dev@example.com`."
- "Clone `build-box` as `build-box-2`."
- "Delete the `old-test` machine."

## Safety notes

- **Generated private keys are returned once.** `add-ssh-key` with
  `type = "generate"` returns the private key in the tool result. Store it
  immediately and do not share it. Prefer uploading an existing public key.
- **Deletes are permanent.** `delete-machine`, `delete-route` and
  `delete-ssh-key` are marked `destructive_hint = true`. Confirm the exact name
  or id with the list tools first.
- **Public routes are open to the internet.** `create-route` defaults to
  `private`; `shared` requires at least one email.
- **The API key is a secret.** It is stored in the OS keyring by the Jilebi
  CLI and injected into the plugin environment at call time.

## Permissions

The manifest declares a single network permission:

```toml
[tools.<tool>.permissions]
hosts = ["https://jilebi.ai"]
```

The plugin cannot read files, write files, or reach any other host.

## Limitations

The Jilebi public API does not expose command execution, file transfer, or
container logs. This plugin can provision machines and route ports, but it
cannot run commands inside a machine. Use SSH or the Jilebi dashboard for that.

## Development

```bash
npm install
npm run build   # tsc -> index.js
```

Test locally with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector jilebi stdio
```

The plugin functions receive `(request, env)` and must return an MCP tool
result shaped like:

```json
{ "content": [{ "type": "text", "text": "..." }] }
```

Set `isError: true` on failures.

## License

ISC
