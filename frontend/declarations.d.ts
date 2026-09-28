declare module '@react-three/fiber' {
    export const Canvas: any;
    export const useFrame: any;
    export const useThree: any;
}

declare module '@react-three/drei' {
    export const OrbitControls: any;
    export const Environment: any;
    export const ContactShadows: any;
    export const Float: any;
}

declare module '*.png' {
    const value: any;
    export default value;
}

declare module '*.jpg' {
    const value: any;
    export default value;
}
