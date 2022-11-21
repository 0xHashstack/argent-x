import { getNetworkSelector } from "../shared/account/selectors"
import { getAccounts } from "../shared/account/store"
import { ActionItem, ExtQueueItem } from "../shared/actionQueue/types"
import { MessageType } from "../shared/messages"
import { addNetwork, getNetworks } from "../shared/network"
import { preAuthorize } from "../shared/preAuthorizations"
import { assertNever } from "../ui/services/assertNever"
import { accountDeployAction } from "./accounDeployAction"
import { analytics } from "./analytics"
import { BackgroundService } from "./background"
import { openUi } from "./openUi"
import { executeTransactionAction } from "./transactions/transactionExecution"
import { udpDeclareContract } from "./udpAction"

export const handleActionApproval = async (
  action: ExtQueueItem<ActionItem>,
  background: BackgroundService,
): Promise<MessageType | undefined> => {
  const { wallet } = background
  const actionHash = action.meta.hash

  switch (action.type) {
    case "CONNECT_DAPP": {
      const { host } = action.payload
      const selectedAccount = await wallet.getSelectedAccount()

      if (!selectedAccount) {
        openUi()
        return
      }

      analytics.track("preauthorizeDapp", {
        host,
        networkId: selectedAccount.networkId,
      })

      await preAuthorize(selectedAccount, host)

      return { type: "CONNECT_DAPP_RES", data: selectedAccount }
    }

    case "TRANSACTION": {
      try {
        const response = await executeTransactionAction(action, background)

        return {
          type: "TRANSACTION_SUBMITTED",
          data: { txHash: response.transaction_hash, actionHash },
        }
      } catch (error: unknown) {
        return {
          type: "TRANSACTION_FAILED",
          data: { actionHash, error: `${error}` },
        }
      }
    }

    case "DEPLOY_ACCOUNT_ACTION": {
      try {
        const txHash = await accountDeployAction(action, background)

        return {
          type: "DEPLOY_ACCOUNT_ACTION_SUBMITTED",
          data: { txHash, actionHash },
        }
      } catch (exception: unknown) {
        let error = `${exception}`
        if (error.includes("403")) {
          error = `${error}\n\nA 403 error means there's already something running on the selected port. On macOS, AirPlay is using port 5000 by default, so please try running your node on another port and changing the port in Argent X settings.`
        }

        return {
          type: "DEPLOY_ACCOUNT_ACTION_FAILED",
          data: { actionHash, error: `${error}` },
        }
      }
    }

    case "SIGN": {
      const typedData = action.payload
      if (!(await wallet.isSessionOpen())) {
        throw Error("you need an open session")
      }
      const starknetAccount = await wallet.getSelectedStarknetAccount()

      const [r, s] = await starknetAccount.signMessage(typedData)

      return {
        type: "SIGNATURE_SUCCESS",
        data: {
          r: r.toString(),
          s: s.toString(),
          actionHash,
        },
      }
    }

    case "REQUEST_TOKEN": {
      return {
        type: "APPROVE_REQUEST_TOKEN",
        data: { actionHash },
      }
    }

    case "REQUEST_ADD_CUSTOM_NETWORK": {
      try {
        await addNetwork(action.payload)
        return {
          type: "APPROVE_REQUEST_ADD_CUSTOM_NETWORK",
          data: { actionHash },
        }
      } catch (error) {
        return {
          type: "REJECT_REQUEST_ADD_CUSTOM_NETWORK",
          data: { actionHash },
        }
      }
    }

    case "REQUEST_SWITCH_CUSTOM_NETWORK": {
      try {
        const networks = await getNetworks()

        const network = networks.find(
          (n) => n.chainId === action.payload.chainId,
        )

        if (!network) {
          throw Error(
            `Network with chainId ${action.payload.chainId} not found`,
          )
        }

        const accountsOnNetwork = await getAccounts(
          getNetworkSelector(network.id),
        )

        if (!accountsOnNetwork.length) {
          throw Error(
            `No accounts found on network with chainId ${action.payload.chainId}`,
          )
        }

        const selectedAccount = await wallet.selectAccount(accountsOnNetwork[0])

        if (!selectedAccount) {
          throw Error(
            `No accounts found on network with chainId ${action.payload.chainId}`,
          )
        }

        return {
          type: "APPROVE_REQUEST_SWITCH_CUSTOM_NETWORK",
          data: { actionHash, selectedAccount },
        }
      } catch (error) {
        console.error(error)
        return {
          type: "REJECT_REQUEST_SWITCH_CUSTOM_NETWORK",
          data: { actionHash },
        }
      }
    }

    case "DECLARE_CONTRACT_ACTION": {
      try {
        const txHash = await udpDeclareContract(action, background)

        return {
          type: "DECLARE_CONTRACT_ACTION_SUBMITTED",
          data: { txHash, actionHash },
        }
      } catch (exception: unknown) {
        let error = `${exception}`
        if (error.includes("403")) {
          error = `${error}\n\nA 403 error means there's already something running on the selected port. On macOS, AirPlay is using port 5000 by default, so please try running your node on another port and changing the port in Argent X settings.`
        }

        return {
          type: "DECLARE_CONTRACT_ACTION_FAILED",
          data: { actionHash, error: `${error}` },
        }
      }
    }

    default:
      assertNever(action)
  }
}

export const handleActionRejection = async (
  action: ExtQueueItem<ActionItem>,
  _: BackgroundService,
): Promise<MessageType | undefined> => {
  const actionHash = action.meta.hash

  switch (action.type) {
    case "CONNECT_DAPP": {
      return {
        type: "REJECT_PREAUTHORIZATION",
        data: {
          host: action.payload.host,
          actionHash,
        },
      }
    }

    case "TRANSACTION": {
      return {
        type: "TRANSACTION_FAILED",
        data: { actionHash },
      }
    }

    case "DEPLOY_ACCOUNT_ACTION": {
      return {
        type: "DEPLOY_ACCOUNT_ACTION_FAILED",
        data: { actionHash },
      }
    }

    case "SIGN": {
      return {
        type: "SIGNATURE_FAILURE",
        data: { actionHash },
      }
    }

    case "REQUEST_TOKEN": {
      return {
        type: "REJECT_REQUEST_TOKEN",
        data: { actionHash },
      }
    }

    case "REQUEST_ADD_CUSTOM_NETWORK": {
      return {
        type: "REJECT_REQUEST_ADD_CUSTOM_NETWORK",
        data: { actionHash },
      }
    }

    case "REQUEST_SWITCH_CUSTOM_NETWORK": {
      return {
        type: "REJECT_REQUEST_SWITCH_CUSTOM_NETWORK",
        data: { actionHash },
      }
    }

    case "DECLARE_CONTRACT_ACTION": {
      return {
        type: "REQUEST_DECLARE_CONTRACT_REJ",
        data: { actionHash },
      }
    }

    /* TODO: add deploy */

    default:
      assertNever(action)
  }
}
