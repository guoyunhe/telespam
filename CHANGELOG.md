# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.4.0] - 2026-08-25

### Added

- Multi-step verification: `verification` now supports an array of question configs for multi-question verification flow.
- Verification answer options are now randomly shuffled per question.

### Fixed

- `pendingVerifications` now uses composite key `chatId:userId` so the same user can be verified in multiple chats simultaneously.

## [0.3.0] - 2026-08-24

### Added

- Multi-instance support: config file can be an array of bot configurations.
- `commander`-based CLI with `--version` / `--help` flags.
- `botName` is now automatically fetched from the Telegram API (`getMe()`).
- Log messages now include `[@botUsername] [chatName]` prefix for multi-instance clarity.

### Changed

- Extracted config loading helpers into `src/config.ts`.
- Merged duplicate `Config` interface with `TelespamOptions`.
- Log messages use hardcoded English instead of i18n translations.

### Removed

- Removed `botName` from config options (auto-detected via API).

## [0.2.0] - 2026-08-24

### Added

- Daily statistics reports sent to each group at midnight.
- Blacklist split into `nameKeywordBlacklist` and `bioKeywordBlacklist`.

### Fixed

- Full name composition (`first_name` + `last_name`).

## [0.1.1] - 2026-08-23

### Fixed

- Build output configuration.

## [0.1.0] - 2026-08-23

### Added

- Automatic chat join request review with configurable rules.
- `requireProfilePhoto` — reject users without a profile photo.
- `autoApprove` — auto-approve join requests that pass all rules.
- Name & bio keyword blacklist filtering.
- Verification question with inline keyboard and timeout.
- i18n support (English & Chinese).
- Decline notification sent to group with masked user info.
- systemd user service `install` / `uninstall` / `status` commands.
