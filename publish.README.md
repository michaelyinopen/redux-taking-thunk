# Publish to npm

```
npm version patch
```
Then in github, create and publish a release with the tag.

## Explain
`npm version` bumps version in `package.json` and `package-lock.json`.\
Then creates a commit, creates a tag with the new version, and pushes to github.

In github, there is a Github Action that publishes to npm when publishing a release.

## Other commands
```
npm version 1.0.0 --allow-same-version
```
```
git push --delete origin v1.0.2
```

## Setup
In npm, create an access token, and save as github secret NPM_TOKEN.

In `package.json`, related scripts
- `build`
- `prepare`
- `prepublishOnly`
- `preversion`
- `postversion`

Github Action `/workflows/main.yml`.