# Sign Floater Typist for Windows distribution

Floater Typist 1.0.2 currently contains unsigned `Float.exe` and `Float-Setup.exe`. Signing can give Windows a verifiable publisher identity and detect changes to those files. It does not guarantee that Windows SmartScreen or Google Chrome will stop warning about a new or uncommon download.

## The two warning systems

- **Windows Authenticode / SmartScreen:** A publicly trusted code-signing certificate identifies the publisher and signs each executable. Microsoft says new publishers can still see SmartScreen warnings until reputation builds. Self-signed certificates are for testing and are not trusted for public distribution.
- **Chrome Safe Browsing:** Chrome assesses downloads separately and may label an uncommon ZIP suspicious. Signing the EXEs inside the ZIP does not guarantee the ZIP will pass Safe Browsing. If Chrome continues to flag a signed release, follow Google's publisher review process; do not ask users to disable protection or bypass a warning.

## Signing routes to evaluate

1. **Microsoft Store MSIX:** Microsoft signs an accepted MSIX package. This requires packaging and submitting the Win32 app as MSIX; the current ZIP with portable EXE and installer is not an MSIX package. Microsoft Store distribution is the most direct Microsoft-hosted route.
2. **Microsoft Azure Artifact Signing:** Microsoft's signing service for external distribution. Current availability is limited by publisher region and identity type; individual developers are currently eligible only in the US and Canada, while organizations are eligible in the US, Canada, EU, and UK. It is not available to every publisher worldwide.
3. **Publicly trusted OV code-signing certificate:** Obtain a certificate from a trusted CA that can validate the publisher's legal identity and provide the required HSM or hardware-token private-key protection. This is the likely route when Artifact Signing eligibility does not fit the publisher. Confirm pricing, country availability, identity requirements, and timestamp URL directly with the CA before buying.

Do not create or distribute a self-signed certificate. Do not send a private key, HSM PIN, authenticator code, or recovery code in chat or store it in this repository. Keep one publisher identity across releases so its signing reputation can build.

## Prepare a signed release

After the certificate is issued and available in the current user's Windows certificate store/HSM:

1. Keep the original ZIP unchanged and create a new release version or clearly named signed package.
2. Run `scripts/Sign-Windows-Release.ps1` against a copy of the current release, passing the certificate thumbprint, SignTool path if needed, and the HTTPS timestamp URL supplied by the CA.
3. The script signs and verifies `Float.exe` and `Float-Setup.exe`, regenerates `SHA256SUMS.txt`, creates a new ZIP, and writes a matching `.sha256` file. It refuses to overwrite the input or existing output.
4. Check the publisher name, signature validity, extracted-file checksums, archive checksum, and a clean download in Chrome and Windows before publishing the new release. Signing changes the binaries, so the old ZIP hash cannot be reused.
5. Update the release notes/site to say “signed” only after the verification step succeeds. If Chrome still warns, review the warning category and use Google's software publisher review guidance.

Signing is not executed by this preview. A valid certificate and its publisher identity are required first.

