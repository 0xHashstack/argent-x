import { H6 } from "@argent/ui"
import { Box, Image } from "@chakra-ui/react"
import { FC } from "react"

import { NftThumbnailImage } from "./NftThumbnailImage"

interface NftItemProps {
  name: string
  thumbnailSrc: string
  logoSrc?: string
  total?: number
}

const NftItem: FC<NftItemProps> = ({ logoSrc, name, thumbnailSrc, total }) => {
  return (
    <Box as="figure">
      <Box position="relative">
        <NftThumbnailImage src={thumbnailSrc} />
        {logoSrc && (
          <Box
            bg="neutrals.800"
            position="absolute"
            p="1"
            w="48px"
            h="48px"
            bottom="-1"
            left="-1"
            borderRadius="lg"
          >
            <Image src={logoSrc} borderRadius="lg" />
          </Box>
        )}
      </Box>

      <Box
        as="figcaption"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        pt="3"
      >
        <H6 textOverflow="ellipsis" overflow="hidden" whiteSpace="nowrap">
          {name}
        </H6>
        {total && <H6 color="neutrals.400">{total}</H6>}
      </Box>
    </Box>
  )
}

export { NftItem }
