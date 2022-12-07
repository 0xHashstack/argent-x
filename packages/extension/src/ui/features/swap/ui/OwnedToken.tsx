import { TokenButton } from "@argent/ui"
import { BigNumberish } from "ethers"
import { FC } from "react"

import {
  prettifyCurrencyValue,
  prettifyTokenBalance,
} from "../../../../shared/token/price"
import { getTokenIconUrl } from "../../accountTokens/TokenIcon"
import { useTokenAmountToCurrencyValue } from "../../accountTokens/tokenPriceHooks"
import { toTokenView } from "../../accountTokens/tokens.service"
import { TokenDetailsWithBalance } from "../../accountTokens/tokens.state"

const OwnedToken: FC<{
  token: TokenDetailsWithBalance
  amount: BigNumberish
}> = ({ token, amount }) => {
  const currencyValue = useTokenAmountToCurrencyValue(token, amount)

  const { name, image, symbol } = toTokenView(token)
  const displayBalance = prettifyTokenBalance(token)
  const displayCurrencyValue = prettifyCurrencyValue(currencyValue)

  return (
    <TokenButton
      name={name}
      image={image || ""}
      getTokenIconUrl={getTokenIconUrl}
      symbol={symbol}
      showTokenSymbol
      valueLabelPrimary={displayBalance}
      valueLabelSecondary={displayCurrencyValue}
      currencyValue={currencyValue}
      w="100%"
    />
  )
}

export { OwnedToken }
