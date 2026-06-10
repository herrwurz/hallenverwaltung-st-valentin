import {
  parseNotificationTemplateData,
  type BookingChangeNotificationPayload,
  type BookingNotificationPayload,
  type BookingSeriesNotificationPayload,
  type NotificationTemplateData,
} from "@/lib/services/notification-types";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateRange(startsAtIso: string, endsAtIso: string) {
  return `${dateFormatter.format(new Date(startsAtIso))} bis ${dateFormatter.format(new Date(endsAtIso))}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderBookingCommonText(template: { payload: BookingNotificationPayload }) {
  return [
    `Titel: ${template.payload.title}`,
    `Organisation: ${template.payload.organizationName}`,
    `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
    `Termin: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
  ].join("\n");
}

function renderBookingCommonHtml(template: { payload: BookingNotificationPayload }) {
  return `
    <ul>
      <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
      <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
      <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
      <li><strong>Termin:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
    </ul>
  `;
}

function renderSeriesCommonText(template: { payload: BookingSeriesNotificationPayload }) {
  return [
    `Titel: ${template.payload.title}`,
    `Organisation: ${template.payload.organizationName}`,
    `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
    `Zeitraum: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
    `Angelegte Termine: ${template.payload.createdCount}`,
    `Übersprungene Termine: ${template.payload.skippedCount}`,
    typeof template.payload.processedCount === "number" ? `Verarbeitete Termine: ${template.payload.processedCount}` : "",
    typeof template.payload.failedCount === "number" ? `Fehlgeschlagene Termine: ${template.payload.failedCount}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderSeriesCommonHtml(template: { payload: BookingSeriesNotificationPayload }) {
  return `
    <ul>
      <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
      <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
      <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
      <li><strong>Zeitraum:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
      <li><strong>Angelegte Termine:</strong> ${template.payload.createdCount}</li>
      <li><strong>Übersprungene Termine:</strong> ${template.payload.skippedCount}</li>
      ${
        typeof template.payload.processedCount === "number"
          ? `<li><strong>Verarbeitete Termine:</strong> ${template.payload.processedCount}</li>`
          : ""
      }
      ${
        typeof template.payload.failedCount === "number"
          ? `<li><strong>Fehlgeschlagene Termine:</strong> ${template.payload.failedCount}</li>`
          : ""
      }
    </ul>
  `;
}

function renderChangeCommonText(template: { payload: BookingChangeNotificationPayload }) {
  if (!("changeRequestId" in template.payload)) {
    return "";
  }

  return [
    `Titel: ${template.payload.title}`,
    `Organisation: ${template.payload.organizationName}`,
    `Bisher: ${template.payload.oldBuildingName} - ${template.payload.oldRoomName}, ${formatDateRange(template.payload.oldStartAt, template.payload.oldEndAt)}`,
    `Neu: ${template.payload.newBuildingName} - ${template.payload.newRoomName}, ${formatDateRange(template.payload.newStartAt, template.payload.newEndAt)}`,
    template.payload.reason ? `Grund: ${template.payload.reason}` : "",
  ].filter(Boolean).join("\n");
}

function renderChangeCommonHtml(template: { payload: BookingChangeNotificationPayload }) {
  if (!("changeRequestId" in template.payload)) {
    return "";
  }

  return `
    <ul>
      <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
      <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
      <li><strong>Bisher:</strong> ${escapeHtml(template.payload.oldBuildingName)} - ${escapeHtml(template.payload.oldRoomName)}, ${escapeHtml(formatDateRange(template.payload.oldStartAt, template.payload.oldEndAt))}</li>
      <li><strong>Neu:</strong> ${escapeHtml(template.payload.newBuildingName)} - ${escapeHtml(template.payload.newRoomName)}, ${escapeHtml(formatDateRange(template.payload.newStartAt, template.payload.newEndAt))}</li>
      ${template.payload.reason ? `<li><strong>Grund:</strong> ${escapeHtml(template.payload.reason)}</li>` : ""}
    </ul>
  `;
}

export function renderNotificationTemplate(input: NotificationTemplateData | { eventCode: string; payload: unknown }) {
  const template = "payload" in input && typeof input.eventCode === "string" && !("subject" in input)
    ? parseNotificationTemplateData(input.eventCode, input.payload)
    : (input as NotificationTemplateData);

  switch (template.eventCode) {
    case "BOOKING_REQUESTED":
      return {
        subject: `Buchung beantragt: ${template.payload.title}`,
        text: [
          "Ein neuer Buchungsantrag wurde erfasst.",
          "",
          renderBookingCommonText(template),
          template.payload.requestedByName ? `Antragsteller: ${template.payload.requestedByName}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Ein neuer Buchungsantrag wurde erfasst.</p>
          ${renderBookingCommonHtml(template)}
          ${template.payload.requestedByName ? `<p><strong>Antragsteller:</strong> ${escapeHtml(template.payload.requestedByName)}</p>` : ""}
        `,
      };
    case "BOOKING_IN_REVIEW":
      return {
        subject: `Buchung in Prüfung: ${template.payload.title}`,
        text: [
          "Ihr Buchungsantrag befindet sich jetzt in Prüfung.",
          "",
          renderBookingCommonText(template),
          template.payload.processedByName ? `Bearbeitet von: ${template.payload.processedByName}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Ihr Buchungsantrag befindet sich jetzt in Prüfung.</p>
          ${renderBookingCommonHtml(template)}
          ${template.payload.processedByName ? `<p><strong>Bearbeitet von:</strong> ${escapeHtml(template.payload.processedByName)}</p>` : ""}
        `,
      };
    case "BOOKING_APPROVED":
      return {
        subject: `Buchung genehmigt: ${template.payload.title}`,
        text: [
          "Ihre Buchung wurde genehmigt.",
          "",
          renderBookingCommonText(template),
          template.payload.note ? `Kommentar: ${template.payload.note}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Ihre Buchung wurde genehmigt.</p>
          ${renderBookingCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Kommentar:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "BOOKING_REJECTED":
      return {
        subject: `Buchung abgelehnt: ${template.payload.title}`,
        text: [
          "Ihre Buchung wurde abgelehnt.",
          "",
          renderBookingCommonText(template),
          template.payload.note ? `Begründung: ${template.payload.note}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Ihre Buchung wurde abgelehnt.</p>
          ${renderBookingCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Begründung:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "BOOKING_CANCELLED":
      return {
        subject: `Buchung storniert: ${template.payload.title}`,
        text: [
          "Eine Buchung wurde storniert.",
          "",
          renderBookingCommonText(template),
          template.payload.note ? `Hinweis: ${template.payload.note}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Eine Buchung wurde storniert.</p>
          ${renderBookingCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Hinweis:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "BOOKING_SERIES_REQUESTED":
      return {
        subject: `Serienbuchung beantragt: ${template.payload.title}`,
        text: [
          "Eine neue Serienbuchung wurde erfasst.",
          "",
          renderSeriesCommonText(template),
          template.payload.requestedByName ? `Antragsteller: ${template.payload.requestedByName}` : "",
          template.payload.note ? `Hinweis: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Eine neue Serienbuchung wurde erfasst.</p>
          ${renderSeriesCommonHtml(template)}
          ${template.payload.requestedByName ? `<p><strong>Antragsteller:</strong> ${escapeHtml(template.payload.requestedByName)}</p>` : ""}
          ${template.payload.note ? `<p><strong>Hinweis:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "BOOKING_SERIES_IN_REVIEW":
      return {
        subject: `Serienbuchung in Prüfung: ${template.payload.title}`,
        text: [
          "Ihre Serienbuchung befindet sich jetzt in Prüfung.",
          "",
          renderSeriesCommonText(template),
          template.payload.processedByName ? `Bearbeitet von: ${template.payload.processedByName}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Ihre Serienbuchung befindet sich jetzt in Prüfung.</p>
          ${renderSeriesCommonHtml(template)}
          ${template.payload.processedByName ? `<p><strong>Bearbeitet von:</strong> ${escapeHtml(template.payload.processedByName)}</p>` : ""}
        `,
      };
    case "BOOKING_SERIES_APPROVED":
      return {
        subject: `Serienbuchung genehmigt: ${template.payload.title}`,
        text: [
          "Ihre Serienbuchung wurde genehmigt.",
          "",
          renderSeriesCommonText(template),
          template.payload.note ? `Kommentar: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Ihre Serienbuchung wurde genehmigt.</p>
          ${renderSeriesCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Kommentar:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "BOOKING_SERIES_REJECTED":
      return {
        subject: `Serienbuchung abgelehnt: ${template.payload.title}`,
        text: [
          "Ihre Serienbuchung wurde abgelehnt.",
          "",
          renderSeriesCommonText(template),
          template.payload.note ? `Begründung: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Ihre Serienbuchung wurde abgelehnt.</p>
          ${renderSeriesCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Begründung:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "BOOKING_CHANGE_REQUESTED":
      return {
        subject: `Verschiebung beantragt: ${template.payload.title}`,
        text: [
          "Ein Verschiebungsantrag wurde erfasst.",
          "",
          renderChangeCommonText(template),
          template.payload.requestedByName ? `Beantragt von: ${template.payload.requestedByName}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Ein Verschiebungsantrag wurde erfasst.</p>
          ${renderChangeCommonHtml(template)}
          ${template.payload.requestedByName ? `<p><strong>Beantragt von:</strong> ${escapeHtml(template.payload.requestedByName)}</p>` : ""}
        `,
      };
    case "BOOKING_CHANGE_IN_REVIEW":
      return {
        subject: `Verschiebung in Prüfung: ${template.payload.title}`,
        text: [
          "Ihr Verschiebungsantrag befindet sich jetzt in Prüfung.",
          "",
          renderChangeCommonText(template),
          template.payload.processedByName ? `Bearbeitet von: ${template.payload.processedByName}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Ihr Verschiebungsantrag befindet sich jetzt in Prüfung.</p>
          ${renderChangeCommonHtml(template)}
          ${template.payload.processedByName ? `<p><strong>Bearbeitet von:</strong> ${escapeHtml(template.payload.processedByName)}</p>` : ""}
        `,
      };
    case "BOOKING_CHANGE_APPROVED":
      return {
        subject: `Verschiebung genehmigt: ${template.payload.title}`,
        text: [
          "Ihr Verschiebungsantrag wurde genehmigt.",
          "",
          renderChangeCommonText(template),
          template.payload.note ? `Kommentar: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Ihr Verschiebungsantrag wurde genehmigt.</p>
          ${renderChangeCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Kommentar:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "BOOKING_CHANGE_REJECTED":
      return {
        subject: `Verschiebung abgelehnt: ${template.payload.title}`,
        text: [
          "Ihr Verschiebungsantrag wurde abgelehnt.",
          "",
          renderChangeCommonText(template),
          template.payload.note ? `Begründung: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Ihr Verschiebungsantrag wurde abgelehnt.</p>
          ${renderChangeCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Begründung:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "WAITLIST_OFFER_CREATED":
      return {
        subject: `Wartelistenplatz angeboten: ${template.payload.title}`,
        text: [
          "Für Ihren Wartelistenplatz ist ein Angebot frei geworden.",
          "",
          `Titel: ${template.payload.title}`,
          `Organisation: ${template.payload.organizationName}`,
          `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
          `Termin: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
          `Angebot gültig bis: ${dateFormatter.format(new Date(template.payload.offerExpiresAt))}`,
        ].join("\n"),
        html: `
          <p>Für Ihren Wartelistenplatz ist ein Angebot frei geworden.</p>
          <ul>
            <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
            <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
            <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
            <li><strong>Termin:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
            <li><strong>Angebot gültig bis:</strong> ${escapeHtml(dateFormatter.format(new Date(template.payload.offerExpiresAt)))}</li>
          </ul>
        `,
      };
    case "CLOSURE_CREATED":
      return {
        subject: `Sperre angelegt: ${template.payload.targetName}`,
        text: [
          "Eine Sperre wurde angelegt.",
          "",
          `Bereich: ${template.payload.targetName}`,
          `Art: ${template.payload.targetType === "BUILDING" ? "Gebäude" : "Raum"}`,
          `Status: ${template.payload.status}`,
          `Zeitraum: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
          `Öffentlich sichtbar: ${template.payload.isPublic ? "Ja" : "Nein"}`,
          `Grund: ${template.payload.reason}`,
        ].join("\n"),
        html: `
          <p>Eine Sperre wurde angelegt.</p>
          <ul>
            <li><strong>Bereich:</strong> ${escapeHtml(template.payload.targetName)}</li>
            <li><strong>Art:</strong> ${template.payload.targetType === "BUILDING" ? "Gebäude" : "Raum"}</li>
            <li><strong>Status:</strong> ${escapeHtml(template.payload.status)}</li>
            <li><strong>Zeitraum:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
            <li><strong>Öffentlich sichtbar:</strong> ${template.payload.isPublic ? "Ja" : "Nein"}</li>
            <li><strong>Grund:</strong> ${escapeHtml(template.payload.reason)}</li>
          </ul>
        `,
      };
    case "USER_ACCOUNT_CREATED":
      return {
        subject: "Benutzerkonto angelegt",
        text: [
          `Hallo ${template.payload.displayName},`,
          "",
          "für Sie wurde ein Benutzerkonto in der Hallenverwaltung St. Valentin angelegt.",
          "Falls Sie noch kein Passwort erhalten haben, wenden Sie sich bitte an die Verwaltung.",
          template.payload.note ? `Hinweis: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Hallo ${escapeHtml(template.payload.displayName)},</p>
          <p>für Sie wurde ein Benutzerkonto in der Hallenverwaltung St. Valentin angelegt.</p>
          <p>Falls Sie noch kein Passwort erhalten haben, wenden Sie sich bitte an die Verwaltung.</p>
          ${template.payload.note ? `<p><strong>Hinweis:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "USER_ACCOUNT_DEACTIVATED":
      return {
        subject: "Benutzerkonto deaktiviert",
        text: [
          `Hallo ${template.payload.displayName},`,
          "",
          "Ihr Benutzerkonto in der Hallenverwaltung St. Valentin wurde deaktiviert.",
          template.payload.note ? `Hinweis: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Hallo ${escapeHtml(template.payload.displayName)},</p>
          <p>Ihr Benutzerkonto in der Hallenverwaltung St. Valentin wurde deaktiviert.</p>
          ${template.payload.note ? `<p><strong>Hinweis:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
        `,
      };
    case "ORGANIZATION_BLOCKED":
      return {
        subject: `Organisation ${template.payload.status.toLowerCase()}: ${template.payload.organizationName}`,
        text: [
          `Die Organisation "${template.payload.organizationName}" wurde auf Status ${template.payload.status} gesetzt.`,
          template.payload.reason ? `Grund: ${template.payload.reason}` : "",
          typeof template.payload.affectedUserCount === "number"
            ? `Betroffene Benutzer: ${template.payload.affectedUserCount}`
            : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Die Organisation <strong>${escapeHtml(template.payload.organizationName)}</strong> wurde auf Status ${escapeHtml(template.payload.status)} gesetzt.</p>
          ${template.payload.reason ? `<p><strong>Grund:</strong> ${escapeHtml(template.payload.reason)}</p>` : ""}
          ${typeof template.payload.affectedUserCount === "number" ? `<p><strong>Betroffene Benutzer:</strong> ${template.payload.affectedUserCount}</p>` : ""}
        `,
      };
    case "WAITLIST_OFFER_EXPIRED":
      return {
        subject: `Wartelistenangebot abgelaufen: ${template.payload.title}`,
        text: [
          "Ein Wartelistenangebot ist abgelaufen.",
          "",
          `Titel: ${template.payload.title}`,
          `Organisation: ${template.payload.organizationName}`,
          `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
          `Termin: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
          `Abgelaufen am: ${dateFormatter.format(new Date(template.payload.offerExpiresAt))}`,
        ].join("\n"),
        html: `
          <p>Ein Wartelistenangebot ist abgelaufen.</p>
          <ul>
            <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
            <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
            <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
            <li><strong>Termin:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
            <li><strong>Abgelaufen am:</strong> ${escapeHtml(dateFormatter.format(new Date(template.payload.offerExpiresAt)))}</li>
          </ul>
        `,
      };
    case "DAMAGE_REPORTED":
      return {
        subject: `Schaden gemeldet: ${template.payload.buildingName} - ${template.payload.roomName}`,
        text: [
          "Eine neue Schadensmeldung wurde erfasst.",
          "",
          `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
          `Gemeldet am: ${dateFormatter.format(new Date(template.payload.reportedAt))}`,
          template.payload.reportedByName ? `Gemeldet von: ${template.payload.reportedByName}` : "",
          "",
          template.payload.description,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Eine neue Schadensmeldung wurde erfasst.</p>
          <ul>
            <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
            <li><strong>Gemeldet am:</strong> ${escapeHtml(dateFormatter.format(new Date(template.payload.reportedAt)))}</li>
            ${
              template.payload.reportedByName
                ? `<li><strong>Gemeldet von:</strong> ${escapeHtml(template.payload.reportedByName)}</li>`
                : ""
            }
          </ul>
          <p>${escapeHtml(template.payload.description)}</p>
        `,
      };
    case "NO_SHOW_REPORTED":
      return {
        subject: `No-Show gemeldet: ${template.payload.title}`,
        text: [
          "Eine Nichtnutzung wurde gemeldet.",
          "",
          `Titel: ${template.payload.title}`,
          `Organisation: ${template.payload.organizationName}`,
          `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
          `Termin: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
          `Gemeldet am: ${dateFormatter.format(new Date(template.payload.reportedAt))}`,
          template.payload.reportedByName ? `Gemeldet von: ${template.payload.reportedByName}` : "",
          "",
          template.payload.description,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Eine Nichtnutzung wurde gemeldet.</p>
          <ul>
            <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
            <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
            <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
            <li><strong>Termin:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
            <li><strong>Gemeldet am:</strong> ${escapeHtml(dateFormatter.format(new Date(template.payload.reportedAt)))}</li>
            ${
              template.payload.reportedByName
                ? `<li><strong>Gemeldet von:</strong> ${escapeHtml(template.payload.reportedByName)}</li>`
                : ""
            }
          </ul>
          <p>${escapeHtml(template.payload.description)}</p>
        `,
      };
    case "ADMIN_TEST_EMAIL":
      return {
        subject: "Testmail Hallenverwaltung St. Valentin",
        text: [
          "Dies ist eine Testmail aus der Hallenverwaltung St. Valentin.",
          `Empfänger: ${template.payload.recipient}`,
          `Zeitpunkt: ${dateFormatter.format(new Date(template.payload.createdAt))}`,
          template.payload.requestedByName ? `Ausgelöst von: ${template.payload.requestedByName}` : "",
          template.payload.note ? `Hinweis: ${template.payload.note}` : "",
        ].filter(Boolean).join("\n"),
        html: `
          <p>Dies ist eine Testmail aus der Hallenverwaltung St. Valentin.</p>
          <ul>
            <li><strong>Empfänger:</strong> ${escapeHtml(template.payload.recipient)}</li>
            <li><strong>Zeitpunkt:</strong> ${escapeHtml(dateFormatter.format(new Date(template.payload.createdAt)))}</li>
            ${template.payload.requestedByName ? `<li><strong>Ausgelöst von:</strong> ${escapeHtml(template.payload.requestedByName)}</li>` : ""}
            ${template.payload.note ? `<li><strong>Hinweis:</strong> ${escapeHtml(template.payload.note)}</li>` : ""}
          </ul>
        `,
      };
  }
}
