require("dotenv").config();

const bcrypt = require("bcryptjs");
const userRepository = require("./repositories/userRepository");

(async () => {

    const user = await userRepository.findByEmail("admin@synaptiq.ai");

    console.log("USER:");
    console.log(user);

    const ok = await bcrypt.compare(
        "S115M248k",
        user.password
    );

    console.log("\nPASSWORD MATCH:");
    console.log(ok);

    process.exit(0);

})();