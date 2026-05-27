import { buildRequestHistoryData } from "@/lib/services/booking-rules";

export type BookingRequestWriteData = {
  organizationId: string;
  roomId: string;
  usageTypeId: string;
  requestedByUserId: string;
  kind: "SINGLE";
  status: "REQUESTED";
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  blockedFrom: Date;
  blockedUntil: Date;
};

type BookingRequestWriter = {
  booking: {
    create: (args: { data: BookingRequestWriteData }) => Promise<{ id: string }>;
  };
  bookingStatusHistory: {
    create: (args: {
      data: ReturnType<typeof buildRequestHistoryData> & { bookingId: string };
    }) => Promise<unknown>;
  };
};

export async function persistBookingRequest(client: BookingRequestWriter, data: BookingRequestWriteData) {
  const booking = await client.booking.create({ data });

  await client.bookingStatusHistory.create({
    data: {
      bookingId: booking.id,
      ...buildRequestHistoryData(data.requestedByUserId, data.startsAt, data.endsAt),
    },
  });

  return booking;
}
