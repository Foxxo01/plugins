function addVersionBadge(badge) {
    const store = Vencord.Webpack.findStore("UserProfileStore");
    const orig = store.getUserProfile;

    store.getUserProfile = function (userId) {
        const profile = orig.apply(this, arguments);
        const currentUser = Vencord.Webpack.Common.UserStore.getCurrentUser();

        if (!profile || userId !== currentUser?.id) return profile;

        profile.badges = Array.isArray(profile.badges)
            ? profile.badges
            : [];

        profile.badges = profile.badges.filter(x =>
            ![
                "custom_beta",
                "custom_alpha",
                "custom_experiment",
                "custom_staff"
            ].includes(x.id)
        );

        profile.badges.unshift({
            id: badge.id,
            description: badge.description,
            icon: badge.icon,
            link: badge.link || "#"
        });

        return profile;
    };
}

const VERSION_TYPE = "beta";

const BADGES = {
    beta: {
        id: "custom_beta",
        description: "Beta",
        icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983865592152245/1790091886924.png?ex=6ab3f51c&is=6ab2a39c&hm=300eba4285efb26c73bacf71627d029f4f161b0ff0deac3ad9cca69b329cdf91&"
    },

    alpha: {
        id: "custom_alpha",
        description: "Alpha",
        icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983896915222540/1790091895984.png?ex=6ab3f523&is=6ab2a3a3&hm=65ddac561bea57b11e7a16fcd0032ae44474fa0620cba7342a71b15b142e5fca&"
    },

    experiment: {
        id: "custom_experiment",
        description: "Experiment",
        icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983912459309066/1790091908099.png?ex=6ab3f527&is=6ab2a3a7&hm=b8cfce516dac0fd0bddb84e68e7508c1cf9e5363174d346b2e24b078168cbcf7&"
    },

    staff: {
        id: "custom_staff",
        description: "Staff",
        icon: "https://cdn.discordapp.com/attachments/1536374550302953583/1551983917228367985/1790091927971.png?ex=6ab3f528&is=6ab2a3a8&hm=b2cb35148f1fbf7657a6f26ccde4f134dfd91c55cb3dd3472aa02aeaebf15906&"
    }
};

const selectedBadge = BADGES[VERSION_TYPE];

if (selectedBadge) {
    addVersionBadge(selectedBadge);
}
