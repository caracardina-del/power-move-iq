import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Power Move IQ" },
      {
        name: "description",
        content: "How Power Move IQ handles your account, cases, and outcomes.",
      },
      { property: "og:title", content: "Power Move IQ Privacy" },
      {
        property: "og:description",
        content: "How account, case, and outcome information is handled.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});
function Privacy() {
  return (
    <div className="page-shell article">
      <p className="eyebrow">PRIVACY NOTICE</p>
      <h1>Privacy</h1>
      <p className="lead">
        Your decision history can be sensitive. Personal cases, chosen moves, outcomes, favorites, and streaks are tied
        to your account and are not visible to other users.
      </p>
      <h2>Information we process</h2>
      <p>
        Your email and optional display name, the situations you submit, the analyses generated for you, saved cases,
        recorded outcomes, favorites, preferences, and basic usage needed to run the service. A guest analysis is stored
        privately on our server before signup so we can deliver the result and save it to your account if you choose to
        sign in. We use a hashed network identifier to limit free guest requests. Payments are handled by Stripe; we do
        not receive or store your full card details.
      </p>
      <h2>How analyses are produced</h2>
      <p>
        When you run an analysis, the text you submit is sent to an AI model provider to generate the result. Avoid
        including information you do not want processed, such as other people’s personal details, passwords, or account
        numbers.
      </p>
      <h2>How it is used</h2>
      <p>
        To provide decision-support, keep your history available to you, secure your account, manage your subscription,
        and respond to support requests. We do not sell your personal information.
      </p>
      <h2>Your choices</h2>
      <p>
        You can update your display name and preferences in Account, and cancel a subscription at any time from Account
        → Manage subscription. To request deletion of your account and data, email{" "}
        <a href="mailto:powermoveiq@gmail.com?subject=Account%20deletion%20request">powermoveiq@gmail.com</a> from the
        address on your account with the subject "Account deletion request". Deletion is handled manually: we will
        confirm by email once your account and data have been removed. Nothing is deleted automatically when you send
        the request. Please cancel any active subscription first so billing stops.
      </p>
      <p className="text-xs text-muted-foreground">
        This notice describes the service as it currently operates and may be updated as the product changes.
      </p>
    </div>
  );
}
