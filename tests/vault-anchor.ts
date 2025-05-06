import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { VaultAnchor } from "../target/types/vault_anchor";
import { expect } from "chai";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { deriveVault, deriveVaultState, displayAccountInfo } from "./helper";

describe("vault-anchor", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultAnchor as Program<VaultAnchor>;
  console.log("Program:", program);

  const depositAmount = new BN(2 * LAMPORTS_PER_SOL);
  console.log("Deposit: ", depositAmount);

  const withdrawAmount = new BN(1 * LAMPORTS_PER_SOL);
  console.log("Withdraw: ", withdrawAmount);

  const user = provider.wallet.publicKey;
  console.log("User: ", user);

  const systemProgram = anchor.web3.SystemProgram.programId;
  console.log("System Program: ", systemProgram);

  const [vaultStatePda, vaultStateBump] = await deriveVaultState(
    user,
    program.programId
  );

  const [vaultPda, vaultBump] = await deriveVault(
    vaultStatePda,
    program.programId
  );

  const connection = provider.connection;
  console.log("Connection: ", connection);

  it("Initializes the Vault", async () => {
    const transaction = await program.methods
      .initialize()
      .accountsPartial({
        vaultState: vaultStatePda,
        user,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize Transaction:", transaction);

    const vaultStateAccount = await program.account.vaultState.fetch(
      vaultStatePda
    );
    console.log("Vault State Account:", vaultStateAccount);

    expect(vaultStateAccount.vaultBump).to.equal(vaultBump);
    expect(vaultStateAccount.stateBump).to.equal(vaultStateBump);
  });

  it("Deposits Lamports into the Vault", async () => {
    const vaultBalanceBefore = await connection.getBalance(vaultPda);

    const transaction = await program.methods
      .deposit(depositAmount)
      .accountsPartial({
        user,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram,
      })
      .rpc();

    console.log("Deposit Transaction: ", transaction);

    await displayAccountInfo(provider, vaultPda, vaultStatePda);

    const vaultBalanceAfter = await connection.getBalance(vaultPda);
    const diff = vaultBalanceAfter - vaultBalanceBefore;
    expect(diff).to.equal(depositAmount.toNumber());
  });

  it("Withdraws Lamports from the Vault", async () => {
    await program.methods
      .deposit(depositAmount)
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vaultBalanceBeforeWithdraw = await connection.getBalance(vaultPda);
    const userBalanceBeforeWithdraw = await connection.getBalance(
      provider.wallet.publicKey
    );

    const transaction = await program.methods
      .withdraw(withdrawAmount)
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Withdraw Transaction:", transaction);

    await displayAccountInfo(provider, vaultPda, vaultStatePda);

    const vaultBalanceAfterWithdraw = await connection.getBalance(vaultPda);
    const userBalanceAfterWithdraw = await connection.getBalance(
      provider.wallet.publicKey
    );

    expect(vaultBalanceBeforeWithdraw - vaultBalanceAfterWithdraw).to.equal(
      withdrawAmount.toNumber()
    );
    expect(userBalanceAfterWithdraw).to.be.greaterThan(
      -1 * userBalanceBeforeWithdraw
    );
  });

  it("Closes the Vault: ", async () => {
    await program.methods
      .deposit(depositAmount)
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const userBalanceBeforeClose = await connection.getBalance(
      provider.wallet.publicKey
    );

    const transaction = await program.methods
      .close()
      .accountsPartial({
        user: provider.wallet.publicKey,
        vaultState: vaultStatePda,
        vault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Close Transaction:", transaction);

    try {
      await program.account.vaultState.fetch(vaultStatePda);
      expect.fail("vault_state account should be closed");
    } catch (err) {
      console.log("vault_state account is closed as expected");
    }

    const userBalanceAfterClose = await connection.getBalance(
      provider.wallet.publicKey
    );
    expect(userBalanceAfterClose).to.be.greaterThan(userBalanceBeforeClose);
  });
});
