# Resiro mobile

Rust mobile client for iOS and Android, using Dioxus 0.7 and the private Resiro API.

The client signs in against the production service, scopes every request with an opaque bearer session, displays property records, searches and reads extracted document text, uploads supported receipts/documents, lists assets and activity, and asks source-grounded property questions. Sessions currently remain in memory and are discarded on app exit; no password is stored on the device. Network access is required.

## Cloud previews

The Mobile preview builds workflow compiles an Android preview APK and an iOS simulator application. A successful compilation is not device acceptance or a store release. See actual workflow results and artifacts before installing or claiming support.

## Release gates still required

Apple Developer and Google Play Console enrolment, verified legal owner and support/privacy contacts, production signing, store identifiers, store screenshots and metadata, physical-device acceptance, accessibility and lifecycle checks, notification permission and delivery tests, secure persistent-session storage, original-file viewing/sharing, and store review. iOS simulator builds cannot be installed on an iPhone. Android debug signing is for preview only.

The backend rejects native CAD/design formats. Real personal property data must never be bundled into this client or exposed through shared demo accounts.
