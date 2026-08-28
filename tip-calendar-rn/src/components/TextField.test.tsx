import { TextInput } from "react-native"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

import { TextField } from "./TextField"

describe("TextField", () => {
  it("passes testID to the editable text input", () => {
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <TextField label="Hours worked" testID="shift-hours-input" value="" onChangeText={() => undefined} />,
      )
    })

    expect(tree?.root.findByType(TextInput).props.testID).toBe("shift-hours-input")
  })
})
