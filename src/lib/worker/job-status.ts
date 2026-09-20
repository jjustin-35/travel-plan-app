type UpdateManyResult = {
  count: number;
};

type AIGenerationJobDelegate = {
  updateMany: (args: {
    where: {
      idempotencyKey: string;
      status?: string | { in: string[] };
    };
    data: {
      status: string;
      completedAt?: Date;
      errorMessage?: string | null;
    };
  }) => Promise<UpdateManyResult>;
};

type TripDelegate = {
  updateMany: (args: {
    where: { id: string };
    data: { status: string };
  }) => Promise<UpdateManyResult>;
};

type JobStatusDb = {
  aIGenerationJob: AIGenerationJobDelegate;
  trip: TripDelegate;
};

const PROCESSABLE_STATUSES = ["pending", "processing", "failed"];

export async function markGenerationJobProcessing(
  db: Pick<JobStatusDb, "aIGenerationJob">,
  idempotencyKey: string
): Promise<boolean> {
  const result = await db.aIGenerationJob.updateMany({
    where: {
      idempotencyKey,
      status: { in: PROCESSABLE_STATUSES },
    },
    data: {
      status: "processing",
      errorMessage: null,
    },
  });

  return result.count > 0;
}

export async function markGenerationJobDone(
  db: Pick<JobStatusDb, "aIGenerationJob">,
  idempotencyKey: string
): Promise<void> {
  await db.aIGenerationJob.updateMany({
    where: {
      idempotencyKey,
      status: "processing",
    },
    data: {
      status: "done",
      completedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function markGenerationJobFailed(
  db: JobStatusDb,
  tripId: string,
  idempotencyKey: string,
  errorMessage: string
): Promise<void> {
  await Promise.all([
    db.trip.updateMany({
      where: { id: tripId },
      data: { status: "failed" },
    }),
    db.aIGenerationJob.updateMany({
      where: {
        idempotencyKey,
        status: { in: PROCESSABLE_STATUSES },
      },
      data: {
        status: "failed",
        errorMessage,
      },
    }),
  ]);
}
