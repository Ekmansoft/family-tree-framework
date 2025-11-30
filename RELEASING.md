# Releasing and Versioning

We use Semantic Versioning (SemVer) and Git tags tied to `package.json`.

- Version format: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`).
- Git tag format: `vMAJOR.MINOR.PATCH` (e.g., `v1.2.3`).
- The `package.json` `version` must match the Git tag for each release.

## How to cut a release

Prerequisites: working tree clean, tests green (`npm test`).

1. Choose bump type:
   - Patch (bug fixes): `npm run release:patch`
   - Minor (backwards-compatible features): `npm run release:minor`
   - Major (breaking changes): `npm run release:major`

2. What these commands do:
   - Runs `npm version <type>`: updates `package.json`, creates a commit, and creates a tag `vX.Y.Z`.
   - Runs `git push` and `git push --tags` to update the remote branch and tag.

3. Verify:
   - Check remote tags: `git ls-remote --tags origin | grep v`.
   - Optionally publish to npm (if applicable): `npm publish`.

## Notes

- Keep commit messages conventional when possible; it helps changelog generation if we add automation later.
- CI/CD can be extended to build on tag push.
- If you need to set a specific version manually: `npm version 1.2.3` then `git push && git push --tags`.
