import {
  BarBackButton,
  ButtonCell,
  CellStack,
  NavigationContainer,
  P4,
  SpacerCell,
  Switch,
  icons,
} from "@argent/ui"
import { Center, Flex, Image, Spinner } from "@chakra-ui/react"
import { FC, useCallback, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { settingsStore } from "../../../shared/settings"
import { ARGENT_SHIELD_ENABLED } from "../../../shared/shield/constants"
import { useKeyValueStorage } from "../../../shared/storage/hooks"
import { parseAmount } from "../../../shared/token/amount"
import { isDeprecated } from "../../../shared/wallet.service"
import { AddressCopyButton } from "../../components/AddressCopyButton"
import { routes, useReturnTo } from "../../routes"
import { upgradeAccount } from "../../services/backgroundAccounts"
import {
  openBlockExplorerAddress,
  useBlockExplorerTitle,
} from "../../services/blockExplorer.service"
import {
  getUint256CalldataFromBN,
  sendTransaction,
} from "../../services/transactions"
import { Account } from "../accounts/Account"
import {
  getAccountName,
  useAccountMetadata,
} from "../accounts/accountMetadata.state"
import { getNetworkAccountImageUrl } from "../accounts/accounts.service"
import { useAccount } from "../accounts/accounts.state"
import { useCurrentNetwork } from "../networks/useNetworks"
import {
  ChangeGuardian,
  usePendingChangeGuardian,
} from "../shield/usePendingChangingGuardian"
import { AccountEditName } from "./AccountEditName"

const {
  ExpandIcon,
  HideIcon,
  PluginIcon,
  AlertIcon,
  ArgentShieldIcon,
  NetworkIcon,
} = icons

const LOCAL_NETWORK = "Localhost 5050"

export const AccountEditScreen: FC = () => {
  const currentNetwork = useCurrentNetwork()
  const { accountAddress = "" } = useParams<{ accountAddress: string }>()
  const navigate = useNavigate()
  const returnTo = useReturnTo()
  const { accountNames, setAccountName } = useAccountMetadata()
  const account = useAccount({
    address: accountAddress,
    networkId: currentNetwork.id,
  })
  const accountName = account
    ? getAccountName(account, accountNames)
    : "Not found"
  const blockExplorerTitle = useBlockExplorerTitle()
  const pendingChangeGuardian = usePendingChangeGuardian(account)

  const [liveEditingAccountName, setLiveEditingAccountName] =
    useState(accountName)

  const onClose = useCallback(() => {
    if (returnTo) {
      navigate(returnTo)
    } else {
      navigate(-1)
    }
  }, [navigate, returnTo])

  const experimentalPluginAccount = useKeyValueStorage(
    settingsStore,
    "experimentalPluginAccount",
  )

  const showDelete =
    account && (isDeprecated(account) || account.networkId === "localhost")

  const handleHideOrDeleteAccount = async (account: Account) => {
    if (showDelete) {
      navigate(routes.accountDeleteConfirm(account.address))
    } else {
      navigate(routes.accountHideConfirm(account.address))
    }
  }

  const canUpgradeToPluginAccount =
    experimentalPluginAccount &&
    account &&
    currentNetwork.accountClassHash?.argentPluginAccount &&
    account.type !== "argent-plugin"

  const onChangeName = useCallback((name: string) => {
    setLiveEditingAccountName(name)
  }, [])

  const onSubmitChangeName = useCallback(() => {
    account &&
      setAccountName(account.networkId, account.address, liveEditingAccountName)
  }, [account, liveEditingAccountName, setAccountName])

  const onCancelChangeName = useCallback(() => {
    setLiveEditingAccountName(accountName)
  }, [accountName])

  const accountSubtitle = pendingChangeGuardian
    ? `${
        pendingChangeGuardian === ChangeGuardian.ADDING ? "Adding" : "Removing"
      } Argent Shield…`
    : `Two-factor account protection`

  const handleDeploy = () => {
    if (account) {
      const ONE_GWEI = getUint256CalldataFromBN(parseAmount("1", 0))
      const self = account.address
      const ETH_TOKEN_ADDRESS =
        "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
      sendTransaction({
        to: ETH_TOKEN_ADDRESS,
        method: "transfer",
        calldata: {
          recipient: self,
          amount: ONE_GWEI,
        },
      })
    }
  }
  return (
    <>
      <NavigationContainer
        leftButton={<BarBackButton onClick={onClose} />}
        title={liveEditingAccountName}
      >
        <Center p={4}>
          <Image
            borderRadius={"full"}
            width={20}
            height={20}
            src={getNetworkAccountImageUrl({
              accountName: liveEditingAccountName,
              accountAddress,
              networkId: currentNetwork.id,
              backgroundColor: account?.hidden ? "333332" : undefined,
            })}
          />
        </Center>
        <CellStack>
          <Flex direction={"column"}>
            <AccountEditName
              value={liveEditingAccountName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChangeName(e.target.value)
              }
              onSubmit={onSubmitChangeName}
              onCancel={onCancelChangeName}
              borderBottomLeftRadius={0}
              borderBottomRightRadius={0}
            />
            <Center
              border={"1px solid"}
              borderColor={"border"}
              borderTop={"none"}
              borderBottomLeftRadius="lg"
              borderBottomRightRadius="lg"
              p={2}
            >
              <AddressCopyButton address={accountAddress} />
            </Center>
          </Flex>
          <SpacerCell />
          {ARGENT_SHIELD_ENABLED && (
            <>
              <ButtonCell
                as={Link}
                to={routes.shieldAccountStart(accountAddress)}
                leftIcon={<ArgentShieldIcon fontSize={"xl"} />}
                rightIconOpaque={!pendingChangeGuardian}
                rightIcon={
                  pendingChangeGuardian ? (
                    <Spinner size={"sm"} />
                  ) : (
                    <Switch
                      size={"lg"}
                      isChecked={Boolean(account?.guardian)}
                      onChange={() =>
                        navigate(routes.shieldAccountStart(accountAddress))
                      }
                    />
                  )
                }
              >
                <>Argent Shield</>
                <P4 color="neutrals.300" fontWeight={"normal"}>
                  {accountSubtitle}
                </P4>
              </ButtonCell>
              <SpacerCell />
            </>
          )}
          <ButtonCell
            onClick={() =>
              account &&
              openBlockExplorerAddress(currentNetwork, account.address)
            }
            rightIcon={<ExpandIcon />}
          >
            View on {blockExplorerTitle}
          </ButtonCell>
          <ButtonCell
            onClick={() => account && handleHideOrDeleteAccount(account)}
            icon={<HideIcon />}
          >
            {showDelete ? "Delete" : "Hide"} account
          </ButtonCell>
          {canUpgradeToPluginAccount && (
            <ButtonCell
              onClick={() => upgradeAccount(account, "argent-plugin")}
              icon={<PluginIcon />}
            >
              Use Plugins
            </ButtonCell>
          )}
          {account?.needsDeploy && currentNetwork.name === LOCAL_NETWORK && (
            <ButtonCell onClick={handleDeploy} rightIcon={<NetworkIcon />}>
              Deploy account
            </ButtonCell>
          )}
          <ButtonCell
            color={"error.500"}
            onClick={() => navigate(routes.exportPrivateKey())}
            icon={<AlertIcon />}
          >
            Export private key
          </ButtonCell>
        </CellStack>
      </NavigationContainer>
    </>
  )
}
