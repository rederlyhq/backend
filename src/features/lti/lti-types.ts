// LTIJS has types in DefinitelyTyped that are not up-to-date with the ^5.X.X releases. This is a workaround until new types can be written for v6.

export interface LTIKToken {
    iss: string;
    clientId: string;
    deploymentId: string; // "number" string.
    platformId: string;
    platformInfo: {
        product_family_code: string;
        version: string;
        guid: string;
        name: string;
        description: string;
    };
    user: string; // "number" string
    userInfo: LTIUserInfo;
    platformContext?: LTIPlatformContext;
};

export interface LTIUserInfo {
    given_name: string;
    family_name: string;
    name: string;
    email: string;
}

// This is copied exactly from DefinitelyTyped. 
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/4e325e2bd5bc697d8a1ae0c01095c322d76b3250/types/ltijs/lib/Utils/Platform.d.ts
export interface LTIPlatformContext {
    context: {
        id: string;
        label: string;
        title: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: any[];
    };
    resource: {
        title: string;
        id: string;
    };
    path: string;
    user: string;
    deploymentId: string;
    targetLinkUri: string;
    launchPresentation: {
        locale: string;
        document_target: string;
        return_url: string;
    };
    deepLinkingSettings?: {
        deep_link_return_url: string;
    };
    messageType: string;
    version: string;
    createdAt: Date;
    __v: number;
    __id: string;
    custom: {
        // Apparently, Canvas limits us to lowercase.
        userinfoemail?: string;
        redirect?: string;
    };
};
