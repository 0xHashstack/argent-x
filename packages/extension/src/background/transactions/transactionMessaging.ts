import {
  Account,
  InvocationsSignerDetails,
  TransactionBulk,
  hash,
  number,
  stark,
} from "starknet"

import { TransactionMessage } from "../../shared/messages/TransactionMessage"
import { isAccountDeployed } from "../accountDeploy"
import { HandleMessage, UnhandledMessage } from "../background"
import { getNonce } from "../nonce"
import { argentMaxFee } from "../utils/argentMaxFee"

export const handleTransactionMessage: HandleMessage<
  TransactionMessage
> = async ({ msg, background: { wallet, actionQueue }, respond: respond }) => {
  switch (msg.type) {
    case "EXECUTE_TRANSACTION": {
      const { meta } = await actionQueue.push({
        type: "TRANSACTION",
        payload: msg.data,
      })
      return respond({
        type: "EXECUTE_TRANSACTION_RES",
        data: { actionHash: meta.hash },
      })
    }

    case "ESTIMATE_TRANSACTION_FEE": {
      const selectedAccount = await wallet.getSelectedAccount()
      const starknetAccount = await wallet.getSelectedStarknetAccount()
      const transactions = msg.data
      if (!selectedAccount) {
        throw Error("no accounts")
      }
      try {
        let txFee = "0",
          maxTxFee = "0",
          accountDeploymentFee: string | undefined,
          maxADFee: string | undefined

        if (
          selectedAccount.needsDeploy &&
          !(await isAccountDeployed(
            selectedAccount,
            starknetAccount.getClassAt,
          ))
        ) {
          if ("estimateFeeBulk" in starknetAccount) {
            const bulkTransactions: TransactionBulk = [
              {
                type: "DEPLOY_ACCOUNT",
                payload: await wallet.getAccountDeploymentPayload(
                  selectedAccount,
                ),
              },
              {
                type: "INVOKE_FUNCTION",
                payload: transactions,
              },
            ]

            const estimateFeeBulk = await starknetAccount.estimateFeeBulk(
              bulkTransactions,
            )

            accountDeploymentFee = number.toHex(estimateFeeBulk[0].overall_fee)
            txFee = number.toHex(estimateFeeBulk[1].overall_fee)

            maxADFee = argentMaxFee(estimateFeeBulk[0].suggestedMaxFee)
            maxTxFee = argentMaxFee(estimateFeeBulk[1].suggestedMaxFee)
          }
        } else {
          const { overall_fee, suggestedMaxFee } =
            await starknetAccount.estimateFee(transactions)

          txFee = number.toHex(overall_fee)
          maxTxFee = number.toHex(suggestedMaxFee) // Here, maxFee = estimatedFee * 1.5x
        }

        const suggestedMaxFee = number.toHex(
          stark.estimatedFeeToMaxFee(maxTxFee, 1), // This adds the 3x overhead. i.e: suggestedMaxFee = maxFee * 2x =  estimatedFee * 3x
        )

        return respond({
          type: "ESTIMATE_TRANSACTION_FEE_RES",
          data: {
            amount: txFee,
            suggestedMaxFee,
            accountDeploymentFee,
            maxADFee,
          },
        })
      } catch (error) {
        console.error(error)
        return respond({
          type: "ESTIMATE_TRANSACTION_FEE_REJ",
          data: {
            error:
              (error as any)?.message?.toString?.() ??
              (error as any)?.toString?.() ??
              "Unkown error",
          },
        })
      }
    }

    case "ESTIMATE_ACCOUNT_DEPLOYMENT_FEE": {
      const providedAccount = msg.data
      const account = providedAccount
        ? await wallet.getAccount(providedAccount)
        : await wallet.getSelectedAccount()

      if (!account) {
        throw Error("no accounts")
      }

      try {
        const { overall_fee, suggestedMaxFee } =
          await wallet.getAccountDeploymentFee(account)

        const maxADFee = number.toHex(
          stark.estimatedFeeToMaxFee(suggestedMaxFee, 1), // This adds the 3x overhead. i.e: suggestedMaxFee = maxFee * 2x =  estimatedFee * 3x
        )

        return respond({
          type: "ESTIMATE_ACCOUNT_DEPLOYMENT_FEE_RES",
          data: {
            amount: number.toHex(overall_fee),
            maxADFee,
          },
        })
      } catch (error) {
        console.error(error)
        return respond({
          type: "ESTIMATE_ACCOUNT_DEPLOYMENT_FEE_REJ",
          data: {
            error:
              (error as any)?.message?.toString?.() ??
              (error as any)?.toString?.() ??
              "Unkown error",
          },
        })
      }
    }

    case "ESTIMATE_DECLARE_CONTRACT_FEE": {
      const { classHash, contract, ...restData } = msg.data

      const selectedAccount = await wallet.getSelectedAccount()
      const selectedStarknetAccount =
        "address" in restData
          ? await wallet.getStarknetAccount(restData)
          : await wallet.getSelectedStarknetAccount()

      if (!selectedStarknetAccount) {
        throw Error("no accounts")
      }

      let txFee = "0",
        maxTxFee = "0",
        accountDeploymentFee: string | undefined,
        maxADFee: string | undefined

      try {
        if (
          selectedAccount?.needsDeploy &&
          !(await isAccountDeployed(
            selectedAccount,
            selectedStarknetAccount.getClassAt,
          ))
        ) {
          if ("estimateFeeBulk" in selectedStarknetAccount) {
            const bulkTransactions: TransactionBulk = [
              {
                type: "DEPLOY_ACCOUNT",
                payload: await wallet.getAccountDeploymentPayload(
                  selectedAccount,
                ),
              },
              {
                type: "DECLARE",
                payload: {
                  classHash,
                  contract,
                },
              },
            ]

            const estimateFeeBulk =
              await selectedStarknetAccount.estimateFeeBulk(bulkTransactions)

            accountDeploymentFee = number.toHex(estimateFeeBulk[0].overall_fee)
            txFee = number.toHex(estimateFeeBulk[1].overall_fee)

            maxADFee = argentMaxFee(estimateFeeBulk[0].suggestedMaxFee)
            maxTxFee = estimateFeeBulk[1].suggestedMaxFee
          }
        } else {
          const { overall_fee, suggestedMaxFee } = await (
            selectedStarknetAccount as Account
          ).estimateDeclareFee({
            classHash,
            contract,
          })

          txFee = number.toHex(overall_fee)
          maxTxFee = number.toHex(suggestedMaxFee)
        }

        const suggestedMaxFee = argentMaxFee(maxTxFee) // This adds the 3x overhead. i.e: suggestedMaxFee = maxFee * 2x =  estimatedFee * 3x

        return respond({
          type: "ESTIMATE_DECLARE_CONTRACT_FEE_RES",
          data: {
            amount: txFee,
            suggestedMaxFee,
            accountDeploymentFee,
            maxADFee,
          },
        })
      } catch (error) {
        console.error(error)
        return respond({
          type: "ESTIMATE_DECLARE_CONTRACT_FEE_REJ",
          data: {
            error:
              (error as any)?.message?.toString?.() ??
              (error as any)?.toString?.() ??
              "Unkown error",
          },
        })
      }
    }

    case "ESTIMATE_DEPLOY_CONTRACT_FEE": {
      const { classHash, constructorCalldata, salt, unique } = msg.data

      const selectedAccount = await wallet.getSelectedAccount()
      const selectedStarknetAccount = await wallet.getSelectedStarknetAccount()

      if (!selectedStarknetAccount) {
        throw Error("no accounts")
      }

      let txFee = "0",
        maxTxFee = "0",
        accountDeploymentFee: string | undefined,
        maxADFee: string | undefined

      try {
        if (
          selectedAccount?.needsDeploy &&
          !(await isAccountDeployed(
            selectedAccount,
            selectedStarknetAccount.getClassAt,
          ))
        ) {
          if ("estimateFeeBulk" in selectedStarknetAccount) {
            const bulkTransactions: TransactionBulk = [
              {
                type: "DEPLOY_ACCOUNT",
                payload: await wallet.getAccountDeploymentPayload(
                  selectedAccount,
                ),
              },
              {
                type: "DEPLOY",
                payload: {
                  classHash,
                  salt,
                  unique,
                  constructorCalldata,
                },
              },
            ]

            const estimateFeeBulk =
              await selectedStarknetAccount.estimateFeeBulk(bulkTransactions)

            accountDeploymentFee = number.toHex(estimateFeeBulk[0].overall_fee)
            txFee = number.toHex(estimateFeeBulk[1].overall_fee)

            maxADFee = argentMaxFee(estimateFeeBulk[0].suggestedMaxFee)
            maxTxFee = estimateFeeBulk[1].suggestedMaxFee
          }
        } else {
          const { overall_fee, suggestedMaxFee } = await (
            selectedStarknetAccount as Account
          ).estimateDeployFee({
            classHash,
            salt,
            unique,
            constructorCalldata,
          })
          txFee = number.toHex(overall_fee)
          maxTxFee = number.toHex(suggestedMaxFee)
        }

        const suggestedMaxFee = argentMaxFee(maxTxFee) // This adds the 3x overhead. i.e: suggestedMaxFee = maxFee * 2x =  estimatedFee * 3x

        return respond({
          type: "ESTIMATE_DEPLOY_CONTRACT_FEE_RES",
          data: {
            amount: txFee,
            suggestedMaxFee,
            accountDeploymentFee,
            maxADFee,
          },
        })
      } catch (error) {
        console.log(error)
        return respond({
          type: "ESTIMATE_DEPLOY_CONTRACT_FEE_REJ",
          data: {
            error:
              (error as any)?.message?.toString() ??
              (error as any)?.toString() ??
              "Unkown error",
          },
        })
      }
    }

    case "SIMULATE_TRANSACTION": {
      const transactions = Array.isArray(msg.data) ? msg.data : [msg.data]

      try {
        const selectedAccount = await wallet.getSelectedAccount()
        const starknetAccount =
          (await wallet.getSelectedStarknetAccount()) as Account // Old accounts are not supported

        if (!selectedAccount) {
          throw Error("no accounts")
        }

        const nonce = await getNonce(selectedAccount, wallet)

        const chainId = starknetAccount.chainId

        const version = number.toHex(hash.feeTransactionVersion)

        const signerDetails: InvocationsSignerDetails = {
          walletAddress: starknetAccount.address,
          nonce,
          maxFee: 0,
          version,
          chainId,
        }

        // TODO: Use this when Simulate Transaction allows multiple transaction types
        // const signerDetailsWithZeroNonce = {
        //   ...signerDetails,
        //   nonce: 0,
        // }

        // const accountDeployPayload = await wallet.getAccountDeploymentPayload(
        //   selectedAccount,
        // )

        // const accountDeployInvocation =
        //   await starknetAccount.buildAccountDeployPayload(
        //     accountDeployPayload,
        //     signerDetailsWithZeroNonce,
        //   )

        const { contractAddress, calldata, signature } =
          await starknetAccount.buildInvocation(transactions, signerDetails)

        return respond({
          type: "SIMULATE_TRANSACTION_RES",
          data: {
            type: "INVOKE_FUNCTION",
            contract_address: contractAddress,
            calldata,
            signature,
            nonce,
            version,
            chainId,
          },
        })
      } catch (error) {
        console.log(error)
        return respond({
          type: "SIMULATE_TRANSACTION_REJ",
          data: {
            error:
              (error as any)?.message?.toString() ??
              (error as any)?.toString() ??
              "Unkown error",
          },
        })
      }
    }

    case "TRANSACTION_FAILED": {
      return await actionQueue.remove(msg.data.actionHash)
    }
  }

  throw new UnhandledMessage()
}
