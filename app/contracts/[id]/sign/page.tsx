import React from "react";
import { notFound } from "next/navigation";
import { getPublicContractById, getPublicContractSignatures } from "@/actions/contractActions";
import { PublicSignClient } from "@/components/contracts/public-sign-client";

export const revalidate = 0;

export default async function PublicSignaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Carrega contrato publicamente (bypassing RLS do anon client com admin client)
  const contract = await getPublicContractById(id);
  if (!contract) {
    notFound();
  }

  const signatures = await getPublicContractSignatures(id);

  return (
    <PublicSignClient
      contract={contract}
      initialSignatures={signatures}
    />
  );
}
