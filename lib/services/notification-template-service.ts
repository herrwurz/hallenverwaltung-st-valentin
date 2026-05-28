import {
  parseNotificationTemplateData,
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

function renderBookingCommonText(template: NotificationTemplateData & { payload: NotificationTemplateData["payload"] }) {
  if (!("bookingId" in template.payload)) {
    return "";
  }

  return [
    `Titel: ${template.payload.title}`,
    `Organisation: ${template.payload.organizationName}`,
    `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
    `Termin: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
  ].join("\n");
}

function renderBookingCommonHtml(template: NotificationTemplateData & { payload: NotificationTemplateData["payload"] }) {
  if (!("bookingId" in template.payload)) {
    return "";
  }

  return `
    <ul>
      <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
      <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
      <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
      <li><strong>Termin:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
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
        subject: `Buchung in Pruefung: ${template.payload.title}`,
        text: [
          "Ihr Buchungsantrag befindet sich jetzt in Pruefung.",
          "",
          renderBookingCommonText(template),
          template.payload.processedByName ? `Bearbeitet von: ${template.payload.processedByName}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Ihr Buchungsantrag befindet sich jetzt in Pruefung.</p>
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
          template.payload.note ? `Begruendung: ${template.payload.note}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <p>Ihre Buchung wurde abgelehnt.</p>
          ${renderBookingCommonHtml(template)}
          ${template.payload.note ? `<p><strong>Begruendung:</strong> ${escapeHtml(template.payload.note)}</p>` : ""}
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
    case "WAITLIST_OFFER_CREATED":
      return {
        subject: `Wartelistenplatz angeboten: ${template.payload.title}`,
        text: [
          "Fuer Ihren Wartelistenplatz ist ein Angebot frei geworden.",
          "",
          `Titel: ${template.payload.title}`,
          `Organisation: ${template.payload.organizationName}`,
          `Ort: ${template.payload.buildingName} - ${template.payload.roomName}`,
          `Termin: ${formatDateRange(template.payload.startsAt, template.payload.endsAt)}`,
          `Angebot gueltig bis: ${dateFormatter.format(new Date(template.payload.offerExpiresAt))}`,
        ].join("\n"),
        html: `
          <p>Fuer Ihren Wartelistenplatz ist ein Angebot frei geworden.</p>
          <ul>
            <li><strong>Titel:</strong> ${escapeHtml(template.payload.title)}</li>
            <li><strong>Organisation:</strong> ${escapeHtml(template.payload.organizationName)}</li>
            <li><strong>Ort:</strong> ${escapeHtml(template.payload.buildingName)} - ${escapeHtml(template.payload.roomName)}</li>
            <li><strong>Termin:</strong> ${escapeHtml(formatDateRange(template.payload.startsAt, template.payload.endsAt))}</li>
            <li><strong>Angebot gueltig bis:</strong> ${escapeHtml(dateFormatter.format(new Date(template.payload.offerExpiresAt)))}</li>
          </ul>
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
  }
}
