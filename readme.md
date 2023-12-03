<h1><p align="center">
👀<br/>
Yosano is Always Watching File System.
</p></h1>

```plain

   .-===-._
  /     .  `,
 j  ___'|_   `.
/  /_   __`.  |
| |<o` '<o>|  `.
| |   |    |   )
L_|   __   |__|､
   \      /   / ＼
  ／`---/'   /    ＼
 /    `V    |       ＼
```

# Using

```ts
import { watch } from "yosano";

for (const event of watch("**/*")) {
   console.log(event);
}
```