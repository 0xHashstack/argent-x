import { useCallback } from "react"
import useSWRImmutable from "swr/immutable"

import { TransactionReviewTransactions } from "../../../../shared/transactionReview/interface"
import { clientTransactionReviewService } from "../../../services/transactionReview"
import { useView } from "../../../views/implementation/react"
import { selectedAccountView } from "../../../views/account"
import { Call, RpcProvider, constants, hash } from "starknet"
import { isArray } from "lodash-es"
import { clientAccountService } from "../../../services/account"
import { ActionItem, ExtQueueItem } from "../../../../shared/actionQueue/types"
import { actionQueue } from "../../../../shared/actionQueue"

export interface IUseTransactionReviewV2 {
  calls: Call | Call[]
  actionHash: string
  spendReview: boolean
}

function getSpendCall(_calls: Call | Call[], accountAddress: string) {
  const call: Call = {
    contractAddress: accountAddress,
    entrypoint: "spend",
    calldata: [],
  }
  const calls = Array.isArray(_calls) ? _calls : [_calls]
  let callArray: any[] = []
  let calldata: any[] = []
  let offset = 0
  let totalCalldata = 0
  calls.forEach((_call) => {
    const _callArray = [
      _call.contractAddress,
      hash.getSelectorFromName(_call.entrypoint),
      offset,
      _call.calldata?.length || 0,
    ]
    callArray = callArray.concat(_callArray)
    const _calldata: any = _call.calldata
    console.log("getSpendCall:_calldata", _calldata)
    offset += _call.calldata ? _calldata.length : 0
    calldata = calldata.concat(_calldata)
    totalCalldata += _calldata.length
  })
  const loanId = 4
  call.calldata = [
    loanId,
    calls.length,
    ...callArray,
    totalCalldata,
    ...calldata,
  ]
  call.calldata = [call.calldata.length, ...call.calldata]
  console.log("getSpendCall:call", call)
  return call
}

export const useTransactionReviewV2 = ({
  calls,
  actionHash,
  spendReview,
}: IUseTransactionReviewV2) => {
  const currentAccount = useView(selectedAccountView)

  const transactionReviewFetcher = useCallback(async () => {
    // console.log('waiting 5s simulateAndReview2');
    // await new Promise((res) => setTimeout(res, 5000))
    let _calls = calls
    let _action: ExtQueueItem<ActionItem> | null = null
    if (spendReview) {
      const spendCall = getSpendCall(calls, currentAccount?.address || "")
      const actionSpend: ActionItem = {
        type: "TRANSACTION",
        payload: {
          transactions: [spendCall],
        },
      }
      actionSpend.payload.transactions = [spendCall]
      const actionSpendNew = await actionQueue.add(actionSpend)
      _calls = [spendCall]
      _action = actionSpendNew
    }

    const invokeTransactions: TransactionReviewTransactions = {
      type: "INVOKE",
      calls: isArray(_calls) ? _calls : [_calls],
    }

    const accountDeployTransaction = currentAccount?.needsDeploy
      ? await clientAccountService.getAccountDeploymentPayload(currentAccount)
      : null

    const transactions = accountDeployTransaction
      ? [accountDeployTransaction, invokeTransactions]
      : [invokeTransactions]

    const result = await clientTransactionReviewService.simulateAndReview({
      transactions,
    })

    return { result, action: _action }
  }, [calls, currentAccount])

  /** only fetch a tx simulate and review one time since e.g. a swap may expire */
  return useSWRImmutable(
    [actionHash, spendReview, "useTransactionReviewV2", "simulateAndReview"],
    transactionReviewFetcher,
    {
      shouldRetryOnError: false,
    },
  )
}
