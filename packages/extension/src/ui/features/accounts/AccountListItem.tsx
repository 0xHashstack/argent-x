import { H6, L2, P4, icons, typographyStyles } from "@argent/ui"
import { Circle, Flex, Image, Text, chakra } from "@chakra-ui/react"
import { ComponentProps, FC } from "react"

import { ArgentAccountType } from "../../../shared/wallet.model"
import {
  CustomButtonCell,
  CustomButtonCellProps,
} from "../../components/CustomButtonCell"
import { TransactionStatusIndicator } from "../../components/StatusIndicator"
import { formatTruncatedAddress } from "../../services/addresses"
import { getNetworkAccountImageUrl } from "./accounts.service"

const { LinkIcon, DeployIcon, ViewIcon } = icons

export interface AccountListItemProps extends CustomButtonCellProps {
  accountName: string
  accountAddress: string
  networkId: string
  networkName?: string
  accountType?: ArgentAccountType
  deploying?: boolean
  upgrade?: boolean
  connected?: boolean
  hidden?: boolean
  avatarOutlined?: boolean
}

interface AccountAvatarProps extends ComponentProps<"img"> {
  outlined?: boolean
}

export const AccountAvatar: FC<AccountAvatarProps> = ({
  outlined,
  ...rest
}) => {
  return (
    <Flex position={"relative"} flexShrink={0}>
      <Image borderRadius={"full"} width={12} height={12} {...rest} />
      {outlined && (
        <>
          <Circle
            position={"absolute"}
            top={0}
            size={12}
            borderWidth={"0.25rem"}
            borderColor={"black"}
          />
          <Circle
            position={"absolute"}
            top={0}
            size={12}
            borderWidth={"0.125rem"}
            borderColor={"white"}
          />
        </>
      )}
    </Flex>
  )
}

const NetworkStatusWrapper = chakra(Flex, {
  baseStyle: {
    alignItems: "center",
    justifyContent: "right",
    gap: 1,
    ml: 1,
    pointerEvents: "none",
    ...typographyStyles.L1,
  },
})

export const AccountListItem: FC<AccountListItemProps> = ({
  accountName,
  accountAddress,
  networkId,
  networkName,
  accountType,
  deploying,
  upgrade,
  connected,
  hidden,
  avatarOutlined,
  children,
  ...rest
}) => {
  return (
    <CustomButtonCell {...rest}>
      <AccountAvatar
        outlined={avatarOutlined}
        src={getNetworkAccountImageUrl({
          accountName,
          accountAddress,
          networkId,
          backgroundColor: hidden ? "333332" : undefined,
        })}
      />
      <Flex
        flex={1}
        overflow={"hidden"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Flex direction={"column"} overflow={"hidden"}>
          <Flex gap={1} alignItems={"center"}>
            <H6 overflow={"hidden"} textOverflow={"ellipsis"}>
              {accountName}
            </H6>
            {accountType === "argent-plugin" && (
              <L2
                backgroundColor={"neutrals.900"}
                px={1}
                py={0.5}
                textTransform="uppercase"
                fontWeight={"extrabold"}
                color={"neutrals.200"}
                borderRadius={"base"}
                border={"1px solid"}
                borderColor={"neutrals.700"}
              >
                Plugin
              </L2>
            )}
          </Flex>
          <Flex gap={2} color={"neutrals.400"}>
            <P4 fontWeight={"bold"}>
              {formatTruncatedAddress(accountAddress)}
            </P4>
            {networkName && <P4 noOfLines={1}>{networkName}</P4>}
          </Flex>
        </Flex>
        <Flex direction={"column"}>
          {deploying ? (
            <NetworkStatusWrapper>
              <TransactionStatusIndicator color="orange" />
              Deploying
            </NetworkStatusWrapper>
          ) : upgrade ? (
            <NetworkStatusWrapper>
              <DeployIcon /> Upgrade
            </NetworkStatusWrapper>
          ) : connected ? (
            <NetworkStatusWrapper color="secondary.500">
              <LinkIcon /> Connected
            </NetworkStatusWrapper>
          ) : (
            hidden && (
              <Circle size={10} bg={"neutrals.600"}>
                <Text fontSize={"2xl"}>
                  <ViewIcon />
                </Text>
              </Circle>
            )
          )}
          {children}
        </Flex>
      </Flex>
    </CustomButtonCell>
  )
}
