# Vendored `@jilebi/sdk`

This directory contains a bundled ESM build of the generated Jilebi TypeScript
SDK from [`Datron/jilebi`](https://github.com/Datron/jilebi) at commit
`25c22f4` (SDK version `0.6.2`).

It is vendored because `@jilebi/sdk` is not published to npm yet. Once it is,
replace the `file:vendor/jilebi-sdk` dependency in the plugin's `package.json`
with the published version and delete this directory.

The bundle exposes only the parts used by the plugin:

- `Configuration`, `FetchError`, `ResponseError`
- `MicroVMsApi`
- `RoutesApi`
- `SSHKeysApi`
- Model types: `ApiVm`, `ApiVmCreateRequest`, `ApiVmCreateResponse`,
  `ApiVmGetResponse`, `ApiVmUpdateRequest`, `ApiVmCloneRequest`,
  `ApiVmCloneResponse`, `ApiRoute`, `ApiRouteCreateRequest`,
  `ApiRouteCreateResponse`, `ApiRouteListResponse`, `ApiRouteUpdateRequest`,
  `ApiSshKey`, `ApiSshKeyCreateRequest`, `ApiSshKeyCreateResponse`,
  `ApiSshKeyUpdateRequest`, `ApiSuccess`, `SharedUser`, `VmInfo`

## Regenerating

From the `jilebi` repository:

```bash
cd sdks/typescript
npm install
npm run build
```

Then bundle `dist/esm` with Rollup. Use an entry that re-exports the values
above (plus the model types), resolve with `@rollup/plugin-node-resolve`,
and emit `index.js` (`format: "es"`). Build `index.d.ts` from the same
entry with `rollup-plugin-dts`.

The SDK is licensed under AGPL-3.0. This plugin bundles it; see the plugin's
`package.json` license field.
