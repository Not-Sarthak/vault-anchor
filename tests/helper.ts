import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

export async function deriveVaultState(
  wallet: anchor.web3.PublicKey,
  programId: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  const derivedVaultState = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("state"), wallet.toBuffer()],
    programId
  );

  return derivedVaultState;
}

export async function deriveVault(
  vaultState: anchor.web3.PublicKey,
  programId: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> {
  const derivedVault = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vaultState.toBuffer()],
    programId
  );
  return derivedVault;
}

export async function displayAccountInfo(
  provider: AnchorProvider,
  vaultPda: PublicKey,
  vaultStatePda: PublicKey
) {
  const vaultAccountInfo = await provider.connection.getAccountInfo(vaultPda);
  const vaultStateAccountInfo = await provider.connection.getAccountInfo(
    vaultStatePda
  );
}
