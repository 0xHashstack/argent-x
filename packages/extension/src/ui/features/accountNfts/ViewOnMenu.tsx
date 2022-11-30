import { B3, icons, logos } from "@argent/ui"
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  useDisclosure,
} from "@chakra-ui/react"
import { FC, useRef } from "react"

import { useOnClickOutside } from "../../services/useOnClickOutside"
import { openAspectNft } from "./aspect.service"
import { openMintSquareNft } from "./mint-square.service"

const { DropdownDownIcon } = icons
const { Aspect, Mintsquare } = logos

export interface TokenMenuProps {
  contractAddress: string
  networkId: string
  tokenId: string
}

const ViewOnMenu: FC<TokenMenuProps> = ({
  contractAddress,
  networkId,
  tokenId,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const ref = useRef<HTMLDivElement>(null)

  useOnClickOutside(ref, () => onClose())
  return (
    <>
      <Menu isOpen={isOpen} onClose={onClose} matchWidth gutter={1} size="3xs">
        <MenuButton
          onMouseOver={onOpen}
          aria-label="NFT actions"
          padding="1.5"
          fontSize="xl"
          size="auto"
          rounded="full"
          w="100%"
          as={Button}
          bg="neutrals.700"
        >
          <Flex justifyContent="center" alignItems="center" gap="2">
            <DropdownDownIcon />
            <B3>View on</B3>
          </Flex>
        </MenuButton>
        <MenuList
          bg="transparent"
          boxShadow="none"
          ref={ref}
          onMouseLeave={onClose}
          minW="0"
          w={"155px"}
          rootProps={{ maxWidth: "155px", width: "100%" }}
        >
          <Button
            bg="neutrals.700"
            gap="2"
            my="1"
            w="155px"
            onClick={() => openAspectNft(contractAddress, tokenId, networkId)}
          >
            <Aspect />
            <B3>Aspect</B3>
          </Button>
          <Button
            bg="neutrals.700"
            gap="2"
            my="1"
            w="155px"
            onClick={() =>
              openMintSquareNft(contractAddress, tokenId, networkId)
            }
          >
            <Mintsquare />
            <B3>MintSquare</B3>
          </Button>
        </MenuList>
      </Menu>
    </>
  )
}

export { ViewOnMenu }
